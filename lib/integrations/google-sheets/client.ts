import { google } from 'googleapis';
import path from 'path';

export interface Lead {
  id: string;
  created_time: string;
  ad_id: string;
  ad_name: string;
  form_id: string;
  form_name: string;
  full_name: string;
  phone_number: string;
  lead_status: string;
  [key: string]: string; // Dynamic form fields
}

export class GoogleSheetsClient {
  private sheets;
  private spreadsheetId: string;

  constructor() {
    // Prioridade 1: JSON direto da env var (para Vercel/serverless)
    // Prioridade 2: Arquivo físico (para desenvolvimento local)
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;

    let auth;
    if (credentialsJson) {
      // Serverless: usa credenciais da variável de ambiente
      const credentials = JSON.parse(credentialsJson);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } else {
      // Local: usa arquivo físico
      const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || './google-sheets-credentials.json';
      const keyFile = path.resolve(process.cwd(), credentialsPath);
      auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    }

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured in environment variables');
    }
  }

  /**
   * Reads all leads from ALL sheets in the Google Spreadsheet
   * Each sheet represents a different property/campaign
   * @returns Array of leads with all fields from all sheets
   */
  async getLeads(): Promise<Lead[]> {
    try {
      // Get spreadsheet info to find ALL sheet names
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = spreadsheet.data.sheets;
      if (!sheets || sheets.length === 0) {
        throw new Error('No sheets found in spreadsheet');
      }

      const allLeads: Lead[] = [];

      // Process each sheet
      for (const sheet of sheets) {
        const sheetName = sheet.properties?.title;
        if (!sheetName) continue;

        console.log(`[Google Sheets] Reading sheet: ${sheetName}`);

        // Read all data from this sheet
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:Z`, // Read all columns
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
          console.log(`[Google Sheets] Sheet "${sheetName}" is empty, skipping`);
          continue;
        }

        // First row contains headers
        const headers = rows[0];

        // Map rows to Lead objects
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const lead: any = {};

          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            lead[header] = row[j] || '';
          }

          // Only add if it has an id (required field)
          if (lead.id) {
            allLeads.push(lead as Lead);
          }
        }

        console.log(`[Google Sheets] Sheet "${sheetName}": found ${rows.length - 1} rows, ${allLeads.length} total leads so far`);
      }

      console.log(`[Google Sheets] Total leads from all sheets: ${allLeads.length}`);
      return allLeads;
    } catch (error) {
      console.error('Error reading Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Gets leads created after a specific date
   * @param afterDate ISO date string
   * @returns Filtered array of leads
   */
  async getLeadsAfter(afterDate: string): Promise<Lead[]> {
    const allLeads = await this.getLeads();
    const filterDate = new Date(afterDate);

    return allLeads.filter(lead => {
      const leadDate = new Date(lead.created_time);
      return leadDate > filterDate;
    });
  }

  /**
   * Gets a single lead by ID
   * @param id Lead ID
   * @returns Lead object or null if not found
   */
  async getLeadById(id: string): Promise<Lead | null> {
    const allLeads = await this.getLeads();
    return allLeads.find(lead => lead.id === id) || null;
  }
}

// Singleton instance
let sheetsClient: GoogleSheetsClient | null = null;

export function getSheetsClient(): GoogleSheetsClient {
  if (!sheetsClient) {
    sheetsClient = new GoogleSheetsClient();
  }
  return sheetsClient;
}
