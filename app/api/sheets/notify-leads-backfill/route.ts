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

function renderEmail(leads: LeadRow[]): string {
  const linhas = leads.map((l, i) => {
    const detalhes = [
      l.bairro && `Bairro: ${l.bairro}`,
      l.valorRaw && `Valor: ${formatValor(l.valorRaw)}`,
      l.campanha && `Campanha: ${l.campanha}`,
      l.plataforma && `Plataforma: ${l.plataforma}`,
    ].filter(Boolean).join(' · ')

    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111;">${i + 1}. ${l.nome}</p>
          <p style="margin:0 0 4px 0;font-size:14px;color:#444;">📞 ${formatPhone(l.telefone)}</p>
          ${detalhes ? `<p style="margin:0;font-size:13px;color:#6b7280;">${detalhes}</p>` : ''}
        </td>
      </tr>
    `
  }).join('')

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a1a;padding:20px 24px;">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">📋 Resumo: ${leads.length} leads pendentes de notificação</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px 0;font-size:14px;color:#444;line-height:1.5;">
          Olá Max, encontramos ${leads.length} leads na planilha que ainda não tinham sido notificados por email.
          Todos já estão no CRM. A partir de agora, cada novo lead vai gerar um email individual.
        </p>
        <table style="width:100%;border-collapse:collapse;">${linhas}</table>
        <div style="margin-top:24px;">
          <a href="${CRM_URL}" style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Ver no CRM →</a>
        </div>
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sistema CRM Max Lima — backfill de notificações</p>
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

  // Coleta leads pendentes de notificação: não-teste, sem EMAIL_SENT marcado
  const pendentes: LeadRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const lead = parseLeadRow(rows[i], i + 1) // i+1 = linha 1-based na planilha
    if (!lead.nome || !lead.telefone) continue
    if (isTestLead(lead.nome, lead.leadStatus)) continue
    if (lead.emailStatus === 'EMAIL_SENT') continue
    pendentes.push(lead)
  }

  if (pendentes.length === 0) {
    return NextResponse.json({ notified: 0, message: 'Nenhum lead pendente' })
  }

  // Envia o email único compilado
  const { error: emailError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: DESTINATARIOS,
    subject: `📋 Resumo: ${pendentes.length} leads pendentes de notificação`,
    html: renderEmail(pendentes),
  })

  if (emailError) {
    return NextResponse.json({ error: `Falha no envio: ${emailError.message}` }, { status: 500 })
  }

  // Marca todos como EMAIL_SENT na planilha
  const data = pendentes.map(l => ({
    range: `${SHEET_NAME}!${COL_EMAIL_STATUS_LETTER}${l.rowIndex}`,
    values: [['EMAIL_SENT']],
  }))
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'RAW', data },
  })

  return NextResponse.json({
    notified: pendentes.length,
    leads: pendentes.map(l => ({ nome: l.nome, telefone: l.telefone })),
    message: `${pendentes.length} leads notificados em email único`,
  })
}
