import FormData from 'form-data';

const EVOLUTION_URL = process.env.EVOLUTION_URL!;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE!;

const headers = () => ({
  'Content-Type': 'application/json',
  apikey: EVOLUTION_API_KEY,
});

// Envia mensagem de texto para um número
export async function sendText(phone: string, text: string): Promise<void> {
  const url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ number: phone, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[evolution] Erro ao enviar mensagem: ${err}`);
  }
}

// Baixa mídia de um messageId e retorna como Buffer
export async function downloadMedia(messageId: string): Promise<Buffer | null> {
  const url = `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
  });

  if (!res.ok) return null;

  const data = await res.json() as { base64?: string };
  if (!data.base64) return null;

  return Buffer.from(data.base64, 'base64');
}

// Transcreve áudio usando OpenAI Whisper
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY!;

  const form = new FormData();
  form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, ...form.getHeaders() },
    body: form as unknown as globalThis.BodyInit,
  });

  if (!res.ok) {
    console.error('[evolution] Erro na transcrição de áudio');
    return '[áudio não transcrito]';
  }

  const data = await res.json() as { text: string };
  return data.text ?? '[áudio sem transcrição]';
}

// Descreve imagem usando GPT-4o-mini Vision
export async function describeImage(imageBuffer: Buffer): Promise<string> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY!;
  const base64 = imageBuffer.toString('base64');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Descreva esta imagem de forma concisa em português.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!res.ok) return '[imagem não descrita]';
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? '[imagem sem descrição]';
}

// Apaga mensagem para todos (comando /IA)
export async function deleteMessageForEveryone(
  phone: string,
  messageId: string
): Promise<void> {
  const url = `${EVOLUTION_URL}/chat/deleteMessageForEveryone/${EVOLUTION_INSTANCE}`;

  await fetch(url, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({
      id: messageId,
      remoteJid: `${phone}@s.whatsapp.net`,
      fromMe: true,
    }),
  });
}
