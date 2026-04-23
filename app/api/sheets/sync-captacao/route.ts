import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

const SPREADSHEET_ID = '1v0VpVSoULS-yREZMTLGjofc2baoES0RsK2n9gjb86-E'
const SHEET_NAME = 'Captação'

// IDs fixos do CRM (board padrão + primeiro stage)
const BOARD_ID = '7d9637e4-7bde-4a58-bc41-0bd3f03c329f'
const STAGE_NOVO_LEAD = '298e1028-8fc0-48d0-9d14-14a514415245'
const ORG_ID = '3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45'
const OWNER_ID = '963bb55f-37fe-4404-b0da-6f5f915aa23c'

// Índices das colunas na planilha (baseado no cabeçalho lido)
const COL = {
  id: 0,
  created_time: 1,
  ad_name: 3,
  campaign_name: 7,
  form_name: 9,
  platform: 11,
  bairro: 12,
  valor: 13,
  nome: 14,
  telefone: 15,
  lead_status: 16,
}

function parseCreds(): object {
  // Tentar ler do arquivo google-creds.json na raiz do projeto (preferencial em dev)
  try {
    const credsPath = path.join(process.cwd(), 'google-creds.json')
    return JSON.parse(readFileSync(credsPath, 'utf-8'))
  } catch { /* arquivo não existe, tentar env var */ }

  // Fallback: env var (formato Vercel em produção — vem como JSON puro)
  const raw = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ?? ''
  try { return JSON.parse(raw) } catch { /* segue */ }
  try { return JSON.parse(raw.replace(/\\n/g, '\n')) } catch { /* segue */ }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1).replace(/\\n/g, '\n'))
  }

  throw new Error('Credenciais Google não encontradas. Adicione google-creds.json ou GOOGLE_SHEETS_CREDENTIALS_JSON.')
}

function cleanPhone(raw: string): string {
  // Remove prefixo "p:" e deixa apenas dígitos + "+"
  return raw.replace(/^p:/, '').replace(/\s/g, '').trim()
}

function parseValor(raw: string): number | null {
  const map: Record<string, number> = {
    'ate_500_mil': 450000,
    'entre_500_mil_a_700_mil': 600000,
    'entre_700_mil_a_1_milhão': 850000,
    'entre_700_mil_a_1_milhao': 850000,
    'entre_1_milhão_a_2_milhões': 1500000,
    'entre_1_milhao_a_2_milhoes': 1500000,
    'acima_de_2_milhões': 2000000,
    'acima_de_2_milhoes': 2000000,
  }
  const key = raw.toLowerCase().replace(/\s/g, '_').replace(/ã/g, 'a').replace(/õ/g, 'o').replace(/é/g, 'e')
  return map[raw.toLowerCase()] ?? map[key] ?? null
}

export async function POST(req: NextRequest) {
  // Verificar secret básico para proteger o endpoint
  const secret = req.headers.get('x-sync-secret')
  if (secret !== (process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const creds = parseCreds()
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Ler todas as linhas da aba Captação
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:R2000`,
  })

  const rows = res.data.values ?? []
  if (rows.length < 2) {
    return NextResponse.json({ imported: 0, message: 'Planilha vazia' })
  }

  // Pular cabeçalho, filtrar apenas leads CREATED (não test leads)
  const leadsParaImportar = rows.slice(1).filter(row => {
    const status = (row[COL.lead_status] ?? '').toUpperCase()
    const nome = row[COL.nome] ?? ''
    const isTest = nome.startsWith('<test lead')
    return status === 'CREATED' && !isTest
  })

  if (leadsParaImportar.length === 0) {
    return NextResponse.json({ imported: 0, message: 'Nenhum lead novo para importar' })
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []
  const rowsToMark: number[] = []

  for (let i = 0; i < leadsParaImportar.length; i++) {
    const row = leadsParaImportar[i]
    const sheetRowIndex = rows.findIndex(r => r[COL.id] === row[COL.id])

    const sheetId = row[COL.id] ?? ''
    const nome = (row[COL.nome] ?? '').trim()
    const telefoneRaw = row[COL.telefone] ?? ''
    const telefone = cleanPhone(telefoneRaw)
    const bairro = row[COL.bairro] ?? ''
    const valorRaw = row[COL.valor] ?? ''
    const valor = parseValor(valorRaw)
    const campanha = row[COL.campaign_name] ?? ''
    const plataforma = row[COL.platform] ?? ''
    const createdTime = row[COL.created_time] ?? ''

    if (!nome || !telefone) {
      errors.push(`Linha ${sheetRowIndex + 1}: nome ou telefone vazio`)
      continue
    }

    // Verificar duplicata: contato com mesmo telefone ou mesmo sheet_id nos custom_fields
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('whatsapp_phone', telefone)
      .eq('organization_id', ORG_ID)
      .maybeSingle()

    if (existingContact) {
      skipped++
      rowsToMark.push(sheetRowIndex)
      continue
    }

    // Criar contato
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        name: nome,
        phone: telefone,
        whatsapp_phone: telefone,
        source: `sheets_captacao:${sheetId}`,
        status: 'active',
        organization_id: ORG_ID,
        owner_id: OWNER_ID,
        notes: [
          bairro ? `Bairro: ${bairro}` : '',
          valorRaw ? `Valor estimado: ${valorRaw}` : '',
          campanha ? `Campanha: ${campanha}` : '',
          plataforma ? `Plataforma: ${plataforma}` : '',
        ].filter(Boolean).join('\n'),
      })
      .select('id')
      .single()

    if (contactError) {
      errors.push(`Linha ${sheetRowIndex + 1}: erro ao criar contato — ${contactError.message}`)
      continue
    }

    // Criar deal vinculado ao contato
    const dealTitle = bairro
      ? `${nome} — ${bairro}`
      : nome

    const { error: dealError } = await supabase
      .from('deals')
      .insert({
        title: dealTitle,
        contact_id: contact.id,
        board_id: BOARD_ID,
        stage_id: STAGE_NOVO_LEAD,
        status: 'open',
        value: valor,
        priority: 'medium',
        organization_id: ORG_ID,
        owner_id: OWNER_ID,
        tags: ['captacao', plataforma].filter(Boolean),
        custom_fields: {
          sheet_id: sheetId,
          bairro,
          valor_estimado: valorRaw,
          campanha,
          plataforma,
          captado_em: createdTime,
        },
      })

    if (dealError) {
      errors.push(`Linha ${sheetRowIndex + 1}: erro ao criar deal — ${dealError.message}`)
      // Reverter contato criado
      await supabase.from('contacts').delete().eq('id', contact.id)
      continue
    }

    imported++
    rowsToMark.push(sheetRowIndex)
  }

  // Marcar linhas importadas como IMPORTED na planilha (coluna R = índice 17)
  if (rowsToMark.length > 0) {
    const data = rowsToMark.map(rowIdx => ({
      range: `${SHEET_NAME}!R${rowIdx + 1}`,
      values: [['IMPORTED']],
    }))
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data,
      },
    })
  }

  return NextResponse.json({
    imported,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    message: `${imported} leads importados, ${skipped} duplicatas ignoradas`,
  })
}

// GET — chamado pelo Vercel Cron (Authorization: Bearer <CRON_SECRET>)
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET ?? ''

  // Aceita chamada do cron (Bearer CRON_SECRET) ou do agente (x-sync-secret)
  const fromCron = cronSecret && auth === `Bearer ${cronSecret}`
  const fromAgent = req.headers.get('x-sync-secret') === (process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync')

  if (!fromCron && !fromAgent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Reutiliza a lógica do POST construindo um request sintético
  const syntheticReq = new Request(req.url, {
    method: 'POST',
    headers: { 'x-sync-secret': process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync' },
  })
  return POST(syntheticReq as NextRequest)
}
