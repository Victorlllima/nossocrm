import 'dotenv/config';
import express from 'express';
import { supabase } from './services/supabase.js';
import { bufferMessage, isDuplicate } from './services/buffer.js';
import { sendText, downloadMedia, transcribeAudio, describeImage, deleteMessageForEveryone } from './services/evolution.js';
import { isAgenteSuspenso, suspenderAgente, retomarAgente } from './tools/controle.js';
import { runComercialAgent } from './agents/comercial.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CHIP_PHONE = process.env.CHIP_PHONE ?? '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

// ─── TELEGRAM LONG POLLING ────────────────────────────────────────────────────

async function telegramSend(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Fila por sessão — garante que mensagens da mesma conversa processam em sequência
const sessionQueues = new Map<string, Promise<void>>();

function enqueueSession(sessionId: string, fn: () => Promise<void>): void {
  const prev = sessionQueues.get(sessionId) ?? Promise.resolve();
  const next = prev.then(fn).catch(err =>
    console.error(`[telegram] Erro na sessão ${sessionId}:`, err)
  );
  sessionQueues.set(sessionId, next);
  // Limpa a fila depois que terminar para não vazar memória
  next.finally(() => {
    if (sessionQueues.get(sessionId) === next) sessionQueues.delete(sessionId);
  });
}

async function startTelegramPolling(): Promise<void> {
  if (!TELEGRAM_TOKEN) return;

  // Limpa updates pendentes antes de iniciar (evita processar msgs antigas)
  const initRes = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=-1`
  ).then(r => r.json()) as { ok: boolean; result: TelegramUpdate[] };
  let offset = initRes.ok && initRes.result.length > 0
    ? initRes.result[initRes.result.length - 1].update_id + 1
    : 0;

  console.log('[telegram] Long polling iniciado — @maxbot_v2_bot');

  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?timeout=30&offset=${offset}`
      );
      const data = await res.json() as { ok: boolean; result: TelegramUpdate[] };

      if (!data.ok) { await sleep(3000); continue; }

      for (const update of data.result) {
        offset = update.update_id + 1;

        const msg = update.message;
        if (!msg?.text) continue;

        // Ignora comandos do Telegram (ex: /start, /clear)
        if (msg.text.startsWith('/')) {
          const cmd = msg.text.toLowerCase();
          if (cmd === '/clear' || cmd === '/start' || cmd === '/reset') {
            await telegramSend(msg.chat.id, 'Sistema reiniciado. Como posso te ajudar?');
          }
          continue;
        }

        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const nome = msg.from?.first_name ?? 'visitante';
        const sessionId = `tg-${chatId}`;

        console.log(`[telegram] ${nome} (${chatId}): ${text}`);

        // Enfileira por sessão — nunca processa duas mensagens do mesmo chat em paralelo
        enqueueSession(sessionId, () =>
          processTelegramMessage({ chatId, text, nome, sessionId })
        );
      }
    } catch (err) {
      console.error('[telegram] Erro no polling:', err);
      await sleep(3000);
    }
  }
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
}

async function processTelegramMessage(opts: {
  chatId: number;
  text: string;
  nome: string;
  sessionId: string;
}): Promise<void> {
  const { chatId, text, nome, sessionId } = opts;
  const phone = `tg_${chatId}`;

  // Garante lead no CRM
  await ensureLeadExists(phone, nome);

  // Telegram: sem buffer — fila por sessão já garante serialização
  const response = await runComercialAgent({
    sessionId,
    whatsappId: phone,
    leadNome: nome,
    message: text,
  });

  // Envia resposta de volta no Telegram
  const chunks = splitResponse(response);
  for (const chunk of chunks) {
    await telegramSend(chatId, chunk);
    if (chunks.length > 1) await sleep(600);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Webhook principal — recebe eventos da Evolution API
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Responde imediatamente para não dar timeout

  try {
    const body = req.body;
    const event = body?.event;

    if (event !== 'messages.upsert') return;

    const msg = body?.data;
    if (!msg) return;

    const messageId: string = msg.key?.id ?? '';
    const fromMe: boolean = msg.key?.fromMe === true;

    // Resolve o remoteJid correto (trata caso LID)
    const remoteJid: string =
      msg.key?.addressingMode === 'lid' && msg.key?.remoteJidAlt
        ? msg.key.remoteJidAlt
        : msg.key?.remoteJid ?? '';

    // Ignora mensagens de grupo
    if (remoteJid.includes('@g.us')) return;

    // Extrai número limpo
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

    // Ignora mensagens do próprio chip (watchdog, etc.)
    if (CHIP_PHONE && phone === CHIP_PHONE) return;

    // Deduplicação de webhooks duplicados
    if (messageId && isDuplicate(messageId)) return;

    // Ignora reações e stickers
    const messageType: string = msg.messageType ?? '';
    if (messageType === 'reactionMessage' || messageType === 'stickerMessage') return;

    // --- Mensagens enviadas pelo Max (fromMe: true) ---
    if (fromMe) {
      const text: string = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';

      // Comando /IA — retoma o agente
      if (text.trim() === '/IA') {
        await retomarAgente(phone);
        if (messageId) {
          await deleteMessageForEveryone(phone, messageId);
        }
        await sendText(phone, 'Olá! Estou de volta para te ajudar. 😊');
        return;
      }

      // Qualquer outra mensagem do Max suspende o agente
      await suspenderAgente(phone);
      return;
    }

    // --- Mensagens do lead ---

    // Verifica se agente está suspenso para este lead
    if (await isAgenteSuspenso(phone)) return;

    // Extrai nome do lead
    const leadNome: string = msg.pushName ?? msg.key?.pushName ?? 'visitante';

    // Processa o conteúdo da mensagem conforme o tipo
    let messageText = '';

    switch (messageType) {
      case 'conversation':
      case 'extendedTextMessage':
        messageText = msg.message?.conversation
          ?? msg.message?.extendedTextMessage?.text
          ?? '';
        break;

      case 'audioMessage': {
        const audioBuffer = await downloadMedia(messageId);
        if (audioBuffer) {
          const transcription = await transcribeAudio(audioBuffer);
          messageText = `[Áudio transcrito]: ${transcription}`;
        } else {
          messageText = '[Áudio não processado]';
        }
        break;
      }

      case 'imageMessage': {
        const imageBuffer = await downloadMedia(messageId);
        if (imageBuffer) {
          const description = await describeImage(imageBuffer);
          const caption = msg.message?.imageMessage?.caption ?? '';
          messageText = caption
            ? `[Imagem com legenda "${caption}"]: ${description}`
            : `[Imagem]: ${description}`;
        } else {
          messageText = '[Imagem não processada]';
        }
        break;
      }

      case 'documentWithCaptionMessage':
      case 'documentMessage': {
        const caption = msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption
          ?? msg.message?.documentMessage?.caption
          ?? '';
        messageText = caption ? `[Documento enviado: ${caption}]` : '[Documento enviado]';
        break;
      }

      default:
        // Tipo não suportado — ignora silenciosamente
        return;
    }

    if (!messageText.trim()) return;

    // SessionId único por conversa
    const sessionId = `whatsapp-${phone}`;

    // Garante que o lead existe no CRM
    await ensureLeadExists(phone, leadNome);

    // Buffer: acumula mensagens por 5s — só o primeiro caller processa
    const messages = await bufferMessage(sessionId, messageText);
    if (messages.length === 0) return;

    const fullMessage = messages.join('\n');

    // Roda o agente e envia resposta
    const response = await runComercialAgent({
      sessionId,
      whatsappId: phone,
      leadNome,
      message: fullMessage,
    });

    // Divide respostas longas em múltiplas mensagens (máximo 1000 chars cada)
    const chunks = splitResponse(response);
    for (const chunk of chunks) {
      await sendText(remoteJid, chunk);
      // Pequeno delay entre mensagens para parecer natural
      if (chunks.length > 1) await sleep(800);
    }
  } catch (err) {
    console.error('[webhook] Erro não tratado:', err);
  }
});

// Garante que o lead existe na tabela leads do CRM
async function ensureLeadExists(phone: string, nome: string): Promise<void> {
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('whatsapp_id', phone)
    .maybeSingle();

  if (data) {
    // Atualiza última interação
    await supabase
      .from('leads')
      .update({ ultima_interacao_at: new Date().toISOString() })
      .eq('whatsapp_id', phone);
    return;
  }

  // Cria novo lead
  await supabase.from('leads').insert({
    whatsapp_id: phone,
    name: nome,
    source: 'whatsapp',
    status: 'NEW',
  });
}

// Divide resposta em chunks para envio natural
function splitResponse(text: string, maxLen = 1000): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let current = '';

  for (const p of paragraphs) {
    if ((current + '\n\n' + p).length > maxLen && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + '\n\n' + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── SHEETS SYNC ─────────────────────────────────────────────────────────────

const CRM_URL = process.env.CRM_URL ?? 'http://localhost:3000';
const SHEETS_SYNC_SECRET = process.env.SHEETS_SYNC_SECRET ?? 'crm-max-sync';
const SHEETS_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

async function syncCaptacao(): Promise<void> {
  try {
    const res = await fetch(`${CRM_URL}/api/sheets/sync-captacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': SHEETS_SYNC_SECRET,
      },
    });
    const json = await res.json() as { imported: number; skipped: number; message: string; errors?: string[] };
    if (json.imported > 0 || json.errors) {
      console.log(`[sheets] ${json.message}`);
      if (json.errors?.length) console.warn('[sheets] Erros:', json.errors);
    }
  } catch (err) {
    console.error('[sheets] Erro no sync:', (err as Error).message);
  }
}

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Agente CRM Max rodando na porta ${PORT}`);
  console.log(`[server] Webhook: POST http://localhost:${PORT}/webhook`);

  startTelegramPolling();

  // Sync inicial + intervalo de 5 minutos
  syncCaptacao();
  setInterval(syncCaptacao, SHEETS_SYNC_INTERVAL_MS);
  console.log(`[sheets] Sync da aba Captação ativo — intervalo: 5 min`);
});
