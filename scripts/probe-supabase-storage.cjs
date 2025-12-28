const crypto = require('crypto');

const SUPABASE_TOKEN = process.env.SUPABASE_TOKEN;
const ORG_SLUG = process.env.SUPABASE_ORG_SLUG;

if (!SUPABASE_TOKEN) {
  console.error('Missing SUPABASE_TOKEN env');
  process.exit(1);
}
if (!ORG_SLUG) {
  console.error('Missing SUPABASE_ORG_SLUG env');
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

function strongPass() {
  return crypto.randomBytes(18).toString('base64url') + '!aA1';
}

function redactConn(str) {
  if (!str) return str;
  return str.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
}

async function main() {
  const started = Date.now();
  const name = `nossocrm-probe-${Date.now().toString(36)}`;
  const dbPass = strongPass();

  console.log('[1] Creating project:', name, 'org:', ORG_SLUG);
  const createT0 = Date.now();
  const created = await supa('/v1/projects', {
    method: 'POST',
    body: JSON.stringify({
      name,
      organization_slug: ORG_SLUG,
      db_pass: dbPass,
      region_selection: { type: 'smartGroup', code: 'americas' },
    }),
  });
  if (!created.ok) {
    console.log('Create failed:', created.status, created.json);
    process.exit(2);
  }
  const ref = created.json?.ref;
  console.log('Created ref:', ref, 'in', ((Date.now() - createT0) / 1000).toFixed(1), 's');

  console.log('[2] Polling status until ACTIVE_*');
  const pollT0 = Date.now();
  let status = '';
  for (let i = 1; i <= 120; i++) {
    const st = await supa(`/v1/projects/${encodeURIComponent(ref)}`);
    status = st.json?.status || '';
    const elapsed = ((Date.now() - pollT0) / 1000).toFixed(0);
    console.log(`  status#${i}:`, status, `(${elapsed}s)`);
    if (String(status).toUpperCase().startsWith('ACTIVE')) break;
    await sleep(4000);
  }
  console.log('Project status:', status, 'after', ((Date.now() - pollT0) / 1000).toFixed(1), 's');

  console.log('[3] Fetch pooler config');
  const pooler = await supa(`/v1/projects/${encodeURIComponent(ref)}/config/database/pooler`);
  if (!pooler.ok) {
    console.log('Pooler config failed:', pooler.status, pooler.json);
    process.exit(3);
  }
  const poolerCfg = Array.isArray(pooler.json) ? pooler.json : [];
  const primaryTx = poolerCfg.find(c => String(c?.database_type||'').toUpperCase()==='PRIMARY' && String(c?.pool_mode||'').toLowerCase()==='transaction') || poolerCfg[0];
  console.log('Pooler host:', primaryTx?.db_host, 'port:', primaryTx?.db_port, 'db:', primaryTx?.db_name, 'user template:', primaryTx?.db_user);

  console.log('[4] Create CLI login-role');
  const lr = await supa(`/v1/projects/${encodeURIComponent(ref)}/cli/login-role`, {
    method: 'POST',
    body: JSON.stringify({ read_only: false }),
  });
  if (!lr.ok) {
    console.log('login-role failed:', lr.status, lr.json);
    process.exit(4);
  }
  const role = lr.json?.role;
  const password = lr.json?.password;
  console.log('login-role role:', role, 'ttl_seconds:', lr.json?.ttl_seconds);

  const host = primaryTx?.db_host;
  const port = primaryTx?.db_port || 6543;
  const dbName = primaryTx?.db_name || 'postgres';
  const user = `${role}.${ref}`; // Supavisor requirement
  const dbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?sslmode=require&pgbouncer=true`;
  console.log('[5] DB URL (redacted):', redactConn(dbUrl));

  console.log('[6] Probe: wait for storage.buckets via PG (poll every 5s, up to 20m)');
  const { Client } = require('pg');
  const storageT0 = Date.now();
  let storageReady = false;

  for (let i = 1; i <= 240; i++) {
    const c = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await c.connect();
      const r = await c.query("select (to_regclass('storage.buckets') is not null) as ready");
      storageReady = Boolean(r?.rows?.[0]?.ready);
      const elapsed = ((Date.now() - storageT0) / 1000).toFixed(0);
      console.log(`  storage#${i}:`, storageReady ? 'READY' : 'not-yet', `(${elapsed}s)`);
      if (storageReady) break;
    } catch (e) {
      const msg = e?.message || String(e);
      const elapsed = ((Date.now() - storageT0) / 1000).toFixed(0);
      console.log(`  storage#${i}: conn/query error:`, msg.slice(0, 140), `(${elapsed}s)`);
    } finally {
      try { await c.end(); } catch {}
    }
    await sleep(5000);
  }

  console.log('Storage ready:', storageReady, 'after', ((Date.now() - storageT0) / 1000).toFixed(1), 's');

  console.log('[7] Poke Storage API (list buckets) using service role key');
  const keys = await supa(`/v1/projects/${encodeURIComponent(ref)}/api-keys`);
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

  const supabaseUrl = `https://${ref}.supabase.co`;
  const storageList = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    }
  }).then(async r => ({ status: r.status, text: (await r.text().catch(()=>'' )).slice(0,400) }));

  console.log('Storage list status:', storageList.status, 'body:', storageList.text);

  console.log('[done] total elapsed:', ((Date.now() - started)/1000).toFixed(1), 's');
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
