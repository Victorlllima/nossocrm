import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const POLL_MS = 3000;
const FILTER = process.argv[2]; // ex: node tail-logs.mjs tg-123456

let lastId = 0;

// Busca o último ID existente para não imprimir histórico antigo
const { data: seed } = await supabase
  .from('dialogos')
  .select('id')
  .order('id', { ascending: false })
  .limit(1);

lastId = seed?.[0]?.id ?? 0;

console.log(`\n📡 Aguardando mensagens${FILTER ? ` (sessão: ${FILTER})` : ''}... (Ctrl+C para sair)\n`);

function formatMsg(row) {
  const msg = row.message;
  const role = msg.type === 'human' ? '👤 LEAD ' : '🤖 BOT  ';
  const session = row.session_id.replace('_memory', '');
  const time = new Date(row.created_at ?? Date.now()).toLocaleTimeString('pt-BR');
  const content = (msg.content ?? '').replace(/\n/g, ' ').slice(0, 200);
  return `[${time}] ${role} | ${session}\n         ${content}\n`;
}

while (true) {
  let query = supabase
    .from('dialogos')
    .select('id, session_id, message, created_at')
    .gt('id', lastId)
    .order('id', { ascending: true });

  if (FILTER) query = query.ilike('session_id', `%${FILTER}%`);

  const { data, error } = await query;

  if (error) {
    console.error('[tail] Erro:', error.message);
  } else if (data?.length) {
    for (const row of data) {
      process.stdout.write(formatMsg(row));
    }
    lastId = data[data.length - 1].id;
  }

  await new Promise(r => setTimeout(r, POLL_MS));
}
