const SUPABASE_TOKEN = process.env.SUPABASE_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!SUPABASE_TOKEN) {
  console.error('Missing SUPABASE_TOKEN env');
  process.exit(1);
}
if (!PROJECT_REF) {
  console.error('Missing SUPABASE_PROJECT_REF env');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function supa(path, opts = {}) {
  const url = `https://api.supabase.com${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      authorization: `Bearer ${SUPABASE_TOKEN}`,
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text().catch(() => '');
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

function redactConn(str) {
  if (!str) return str;
  return str.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
}

function stripSslModeParam(connectionString) {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return connectionString;
  }
}

async function main() {
  const started = Date.now();
  console.log('[A] Project ref:', PROJECT_REF);

  console.log('[B] Project status');
  const proj = await supa(`/v1/projects/${encodeURIComponent(PROJECT_REF)}`);
  if (!proj.ok) {
    console.log('Project fetch failed:', proj.status, proj.json);
    process.exit(2);
  }
  console.log('status:', proj.json?.status, 'region:', proj.json?.region, 'db.host:', proj.json?.database?.host);

  console.log('[C] Pooler config');
  const pooler = await supa(`/v1/projects/${encodeURIComponent(PROJECT_REF)}/config/database/pooler`);
  if (!pooler.ok) {
    console.log('Pooler config failed:', pooler.status, pooler.json);
    process.exit(3);
  }
  const poolerCfg = Array.isArray(pooler.json) ? pooler.json : [];
  const primaryTx = poolerCfg.find(c => String(c?.database_type||'').toUpperCase()==='PRIMARY' && String(c?.pool_mode||'').toLowerCase()==='transaction') || poolerCfg[0];
  const host = primaryTx?.db_host;
  const port = primaryTx?.db_port || 6543;
  const dbName = primaryTx?.db_name || 'postgres';
  console.log('pooler:', host, port, dbName, 'user template:', primaryTx?.db_user);

  console.log('[D] CLI login-role');
  const lr = await supa(`/v1/projects/${encodeURIComponent(PROJECT_REF)}/cli/login-role`, {
    method: 'POST',
    body: JSON.stringify({ read_only: false }),
  });
  if (!lr.ok) {
    console.log('login-role failed:', lr.status, lr.json);
    process.exit(4);
  }
  const role = lr.json?.role;
  const password = lr.json?.password;
  const user = `${role}.${PROJECT_REF}`; // Supavisor requirement
  const rawDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?sslmode=require&pgbouncer=true`;
  const dbUrl = stripSslModeParam(rawDbUrl);
  console.log('dbUrl (redacted):', redactConn(dbUrl));

  console.log('[E] Poll storage.buckets (to_regclass)');
  const { Client } = require('pg');
  const t0 = Date.now();
  let ready = false;
  for (let i = 1; i <= 240; i++) {
    const c = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await c.connect();
      const r = await c.query("select (to_regclass('storage.buckets') is not null) as ready");
      ready = Boolean(r?.rows?.[0]?.ready);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  storage#${i}:`, ready ? 'READY' : 'not-yet', `(${elapsed}s)`);
      if (ready) break;
    } catch (e) {
      const msg = e?.message || String(e);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  storage#${i}: error:`, msg.slice(0, 160), `(${elapsed}s)`);
    } finally {
      try { await c.end(); } catch {}
    }
    await sleep(5000);
  }
  console.log('Storage ready:', ready, 'after', ((Date.now() - t0) / 1000).toFixed(1), 's');

  console.log('[F] Storage API poke (list buckets)');
  const keys = await supa(`/v1/projects/${encodeURIComponent(PROJECT_REF)}/api-keys`);
  if (!keys.ok) {
    console.log('api-keys failed:', keys.status, keys.json);
    process.exit(5);
  }
  const service = (keys.json || []).find(k => String(k?.name||'').toLowerCase().includes('service'));
  const serviceKey = service?.api_key;
  if (!serviceKey) {
    console.log('No service role key found');
    process.exit(6);
  }

  const supabaseUrl = `https://${PROJECT_REF}.supabase.co`;
  const r = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }
  });
  const text = await r.text().catch(() => '');
  console.log('storage list:', r.status, text.slice(0, 400));

  console.log('[done] total elapsed:', ((Date.now() - started)/1000).toFixed(1), 's');
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
