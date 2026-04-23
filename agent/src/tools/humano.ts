import { tool } from 'ai';
import { z } from 'zod';

const EVOLUTION_URL = process.env.EVOLUTION_URL!;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE!;
// Número do Max Lima que receberá a notificação de escalada
const MAX_PHONE = process.env.MAX_PHONE!;

export const acionarHumano = tool({
  description:
    'Notifica o Max Lima (corretor) para assumir pessoalmente o atendimento. ' +
    'Use quando: o lead solicitar explicitamente falar com humano, quando houver ' +
    'situação que o agente não consegue resolver, negociação de desconto, ou quando ' +
    'o lead demonstrar frustração.',
  parameters: z.object({
    motivo: z.string().describe('Motivo pelo qual o atendimento humano foi acionado'),
  }),
  execute: async ({ motivo }, { toolCallId }) => {
    const whatsappId: string = (toolCallId as unknown as { whatsappId?: string })?.whatsappId ?? 'desconhecido';

    const mensagem =
      `🚨 *Atendimento humano solicitado*\n\n` +
      `📱 Número: ${whatsappId}\n` +
      `📝 Motivo: ${motivo}\n\n` +
      `Favor assumir a conversa assim que possível.`;

    try {
      const res = await fetch(
        `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
          body: JSON.stringify({ number: MAX_PHONE, text: mensagem }),
        }
      );

      if (!res.ok) {
        console.error('[humano] Erro ao notificar Max:', await res.text());
        return 'Erro ao acionar atendimento humano.';
      }

      return 'Atendimento humano acionado. O Max foi notificado e assumirá a conversa em breve.';
    } catch (err) {
      console.error('[humano] Erro:', err);
      return 'Erro ao acionar atendimento humano.';
    }
  },
});
