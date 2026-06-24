const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (k) env[k] = v;
}

const API_KEY = env.VIBECODE_API_KEY;

function api(method, path, body, timeoutMs) {
  return new Promise((resolve) => {
    const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
    const opts = {
      hostname: 'vibecode.bitrix24.tech',
      path,
      method,
      headers,
      timeout: timeoutMs || 30000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForServer(serverId) {
  for (let i = 0; i < 30; i++) {
    const r = await api('GET', `/v1/infra/servers/${serverId}`);
    if (r.data?.success) {
      const s = r.data.data;
      console.log(`  status=${s.status}, blackhole=${s.blackholeStatus}`);
      if (s.status === 'running' && s.blackholeStatus === 'CONNECTED') return s;
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  throw new Error('Server not ready after 5 min');
}

(async () => {
  console.log('1. Creating server...');
  const create = await api('POST', '/v1/infra/servers', {
    provider: 'bitrix-cloud',
    name: 'checko-deploy',
    plan: 'bc-micro',
    region: 'ru-central1-a',
    image: 'fd8png55fo3dk63i7n54',
  });
  if (!create.data?.success) {
    console.error('Create failed:', JSON.stringify(create.data));
    // Try bc-small if bc-micro not available
    if (create.data?.error?.code === 'INVALID_REQUEST') {
      console.log('Retrying with bc-small plan...');
      const create2 = await api('POST', '/v1/infra/servers', {
        provider: 'bitrix-cloud',
        name: 'checko-deploy',
        plan: 'bc-small',
        region: 'ru-central1-a',
        image: 'fd8png55fo3dk63i7n54',
      });
      if (!create2.data?.success) {
        console.error('Create with bc-small also failed:', JSON.stringify(create2.data));
        return;
      }
      create.data = create2.data;
    } else {
      return;
    }
  }
  const sid = create.data.data.id;
  const subdomain = create.data.data.subdomain;
  console.log(`  Server ID: ${sid}`);
  console.log(`  URL: https://${subdomain}.vibecode.bitrix24.tech`);

  console.log('\n2. Waiting for server to be ready...');
  const serverInfo = await waitForServer(sid);
  console.log('  Server is ready!');

  // Clear any leftover lock from previous failed deploy
  const unlock = await api('DELETE', `/v1/infra/servers/${sid}/lock`);
  console.log('  Lock cleared:', unlock.status);

  console.log('\n3. Deploying app...');
  const deployBody = {
    source: { url: 'https://github.com/fghdhftt/111/archive/refs/heads/master.tar.gz' },
    runtime: 'node20',
    install: 'cd /opt/app/111-master && npm install && npm run build',
    start: 'cd /opt/app/111-master && npm start',
    port: 3000,
    env: {
      NODE_ENV: 'production',
      CHECKO_API_KEY: env.CHECKO_API_KEY || '',
      BITRIX_CLIENT_ID: env.BITRIX_CLIENT_ID || '',
      BITRIX_CLIENT_SECRET: env.BITRIX_CLIENT_SECRET || '',
      APP_URL: `https://${subdomain}.vibecode.bitrix24.tech`,
    },
  };
  console.log('Deploy body (keys hidden):', JSON.stringify({...deployBody, env: {...deployBody.env, CHECKO_API_KEY: '***', BITRIX_CLIENT_SECRET: '***'}}, null, 2));
  const deploy = await api('POST', `/v1/infra/servers/${sid}/deploy?stream=false`, deployBody, 600000);
  console.log('Deploy result:', JSON.stringify(deploy.data, null, 2));
})();
