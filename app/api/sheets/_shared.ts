import { google } from 'googleapis'
import { readFileSync } from 'fs'
import path from 'path'

export const SPREADSHEET_ID = '1v0VpVSoULS-yREZMTLGjofc2baoES0RsK2n9gjb86-E'
export const SHEET_NAME = 'Captação'

// Coluna S (índice 18) = marcador de notificação por email
export const COL_EMAIL_STATUS_LETTER = 'S'
export const COL_EMAIL_STATUS_INDEX = 18

export const COL = {
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
  email_status: 18,
}

export const DESTINATARIOS = ['max.lima90@gmail.com', 'victorlllima@gmail.com']
export const EMAIL_FROM = 'CRM Max Lima <crm@redpro.com.br>'
export const CRM_URL = 'https://crm-maxlima.vercel.app'

export function parseCreds(): object {
  try {
    const credsPath = path.join(process.cwd(), 'google-creds.json')
    return JSON.parse(readFileSync(credsPath, 'utf-8'))
  } catch { /* segue */ }

  const raw = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ?? ''
  try { return JSON.parse(raw) } catch { /* segue */ }
  try { return JSON.parse(raw.replace(/\\n/g, '\n')) } catch { /* segue */ }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1).replace(/\\n/g, '\n'))
  }
  throw new Error('Credenciais Google não encontradas.')
}

export async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: parseCreds(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export function cleanPhone(raw: string): string {
  return raw.replace(/^p:/, '').replace(/\s/g, '').trim()
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
  if (digits.length === 12) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,8)}-${digits.slice(8)}`
  return phone
}

export function formatValor(raw: string): string {
  const map: Record<string, string> = {
    'ate_500_mil': 'Até R$ 500.000',
    'entre_500_mil_a_700_mil': 'R$ 500.000 – R$ 700.000',
    'entre_700_mil_a_1_milhão': 'R$ 700.000 – R$ 1.000.000',
    'entre_700_mil_a_1_milhao': 'R$ 700.000 – R$ 1.000.000',
    'entre_1_milhão_a_2_milhões': 'R$ 1.000.000 – R$ 2.000.000',
    'entre_1_milhao_a_2_milhoes': 'R$ 1.000.000 – R$ 2.000.000',
    'acima_de_2_milhões': 'Acima de R$ 2.000.000',
    'acima_de_2_milhoes': 'Acima de R$ 2.000.000',
  }
  return map[raw.toLowerCase()] ?? raw
}

export type LeadRow = {
  rowIndex: number // 1-based (linha na planilha)
  sheetId: string
  nome: string
  telefone: string
  bairro: string
  valorRaw: string
  campanha: string
  plataforma: string
  createdTime: string
  leadStatus: string
  emailStatus: string
}

export function isTestLead(nome: string, leadStatus: string): boolean {
  if (nome.startsWith('<test lead')) return true
  if (leadStatus.toLowerCase() === 'edit' || leadStatus.toLowerCase() === 'test') return true
  return false
}

export function parseLeadRow(row: string[], rowIndex: number): LeadRow {
  return {
    rowIndex,
    sheetId: row[COL.id] ?? '',
    nome: (row[COL.nome] ?? '').trim(),
    telefone: cleanPhone(row[COL.telefone] ?? ''),
    bairro: row[COL.bairro] ?? '',
    valorRaw: row[COL.valor] ?? '',
    campanha: row[COL.campaign_name] ?? '',
    plataforma: row[COL.platform] ?? '',
    createdTime: row[COL.created_time] ?? '',
    leadStatus: row[COL.lead_status] ?? '',
    emailStatus: row[COL.email_status] ?? '',
  }
}
