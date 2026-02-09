export interface WhatsAppMessage {
  number: string;
  text: string;
}

export interface EvolutionAPIResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class EvolutionAPIClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || '';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';

    if (!this.apiUrl || !this.apiKey) {
      throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured in environment variables');
    }
  }

  /**
   * Sends a WhatsApp message to a phone number
   * @param number Phone number with country code (e.g., 5561992978796)
   * @param text Message text
   * @returns Response from Evolution API
   */
  async sendMessage(number: string, text: string): Promise<EvolutionAPIResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          number,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Message sent successfully',
        ...data,
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends notification to Max about a new lead
   * @param leadData Lead information
   * @param overrideNumbers Optional list of numbers to send to (overrides process.env.MAX_PHONE_NUMBER)
   * @returns Response from Evolution API
   */
  async sendLeadNotificationToMax(
    leadData: {
      nome: string;
      telefone: string;
      empreendimento: string;
      data: string;
      respostas: string;
    },
    overrideNumbers?: string[]
  ): Promise<EvolutionAPIResponse> {
    const maxNumbers = overrideNumbers || [process.env.MAX_PHONE_NUMBER].filter(Boolean) as string[];

    if (maxNumbers.length === 0) {
      throw new Error('MAX_PHONE_NUMBER is not configured');
    }

    const message = `🆕 NOVO LEAD CADASTRADO

👤 Nome: ${leadData.nome}
📱 Telefone: ${leadData.telefone}
🏢 Empreendimento: ${leadData.empreendimento}
📅 Data: ${leadData.data}

📋 RESPOSTAS DO FORMULÁRIO:
${leadData.respostas}

---
✅ Lead adicionado automaticamente ao CRM`;

    const results = await Promise.all(
      maxNumbers.map(number => this.sendMessage(number, message))
    );

    const allSuccessful = results.every(r => r.success);
    if (allSuccessful) {
      return { success: true, message: `Notifications sent to ${maxNumbers.length} numbers` };
    } else {
      const firstError = results.find(r => !r.success)?.error;
      return { success: false, error: firstError || 'Failed to send to one or more numbers' };
    }
  }

  /**
   * Sends initial contact message to a lead
   * @param leadData Lead information
   * @returns Response from Evolution API
   */
  async sendInitialContactToLead(leadData: {
    nome: string;
    telefone: string;
    empreendimento: string;
  }): Promise<EvolutionAPIResponse> {
    const message = `Olá, ${leadData.nome}!

Tudo bem? Aqui é o assistente digital do Max, da RE/MAX.

Vi que você demonstrou interesse na ${leadData.empreendimento} através do nosso formulário. Muito obrigado pelo contato!

Conseguiu analisar as informações, fotos e características do imóvel?

Estou à disposição para esclarecer todas as suas dúvidas! Se quiser, posso ligar para passar maiores informações`;

    return this.sendMessage(leadData.telefone, message);
  }
}

// Singleton instance
let evolutionClient: EvolutionAPIClient | null = null;

export function getEvolutionClient(): EvolutionAPIClient {
  if (!evolutionClient) {
    evolutionClient = new EvolutionAPIClient();
  }
  return evolutionClient;
}
