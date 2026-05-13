import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  SPREADSHEET_ID,
  SHEET_NAME,
  COL_EMAIL_STATUS_LETTER,
  DESTINATARIOS,
  EMAIL_FROM,
  CRM_URL,
  getSheetsClient,
  formatPhone,
  formatValor,
  parseLeadRow,
  isTestLead,
  type LeadRow,
} from '../_shared'

const resend = new Resend(process.env.RESEND_API_KEY)

function renderEmail(l: LeadRow): string {
  const linhas = [
    l.bairro && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Bairro de interesse</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${l.bairro}</td></tr>`,
    l.valorRaw && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Valor estimado</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${formatValor(l.valorRaw)}</td></tr>`,
    l.campanha && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Campanha</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${l.campanha}</td></tr>`,
    l.plataforma && `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Plataforma</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${l.plataforma}</td></tr>`,
  ].filter(Boolean).join('')

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a1a;padding:20px 24px;">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">🏠 Novo lead captado</p>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Nome</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${l.nome}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Telefone</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${formatPhone(l.telefone)}</td></tr>
          ${linhas}
        </table>
        <div style="margin-top:24px;">
          <a href="${CRM_URL}" style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Ver no CRM →</a>
        </div>
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sistema CRM Max Lima — notificação automática</p>
      </div>
    </div>
  `
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== (process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sheets = await getSheetsClient()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:S2000`,
  })

  const rows = res.data.values ?? []
  if (rows.length < 2) {
    return NextResponse.json({ notified: 0, message: 'Planilha vazia' })
  }

  const pendentes: LeadRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const lead = parseLeadRow(rows[i], i + 1)
    if (!lead.nome || !lead.telefone) continue
    if (isTestLead(lead.nome, lead.leadStatus)) continue
    if (lead.emailStatus === 'EMAIL_SENT') continue
    pendentes.push(lead)
  }

  if (pendentes.length === 0) {
    return NextResponse.json({ notified: 0, message: 'Nenhum lead novo' })
  }

  let notified = 0
  const errors: string[] = []
  const enviados: number[] = []

  for (const lead of pendentes) {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: DESTINATARIOS,
      subject: `🏠 Novo lead captado — ${lead.nome}`,
      html: renderEmail(lead),
    })

    if (error) {
      errors.push(`${lead.nome}: ${error.message}`)
      continue
    }
    notified++
    enviados.push(lead.rowIndex)
  }

  if (enviados.length > 0) {
    const data = enviados.map(rowIndex => ({
      range: `${SHEET_NAME}!${COL_EMAIL_STATUS_LETTER}${rowIndex}`,
      values: [['EMAIL_SENT']],
    }))
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'RAW', data },
    })
  }

  return NextResponse.json({
    notified,
    errors: errors.length > 0 ? errors : undefined,
    message: `${notified} leads notificados`,
  })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET ?? ''
  const fromCron = cronSecret && auth === `Bearer ${cronSecret}`
  const fromAgent = req.headers.get('x-sync-secret') === (process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync')

  if (!fromCron && !fromAgent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const syntheticReq = new Request(req.url, {
    method: 'POST',
    headers: { 'x-sync-secret': process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync' },
  })
  return POST(syntheticReq as NextRequest)
}
