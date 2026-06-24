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
const B64 = fs.readFileSync(path.join(__dirname, 'deploy-b64.txt'), 'utf-8').trim();

function api(method, path, body, timeoutMs) {
  return new Promise((resolve) => {
    const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
    const opts = {
      hostname: 'vibecode.bitrix24.tech',
      path,
      method,
      headers,
      timeout: timeoutMs || 60000,
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
  // Check if server da76a437 still exists and is ready
  const sid = 'da76a437-284c-47fa-8462-e72f896487e2';
  const srv = await api('GET', `/v1/infra/servers/${sid}`);
  if (!srv.data?.success) {
    console.error('Server not found, creating new one...');
    const create = await api('POST', '/v1/infra/servers', {
      provider: 'bitrix-cloud',
      name: 'checko-deploy',
      plan: 'bc-micro',
      region: 'ru-central1-a',
      image: 'fd8png55fo3dk63i7n54',
    });
    if (!create.data?.success) {
      console.error('Create failed:', JSON.stringify(create.data));
      return;
    }
    console.log(`Created server: ${create.data.data.id}`);
    console.log(`URL: https://${create.data.data.subdomain}.vibecode.bitrix24.tech`);
    console.log('Waiting for it to be ready...');
    await waitForServer(create.data.data.id);
  } else {
    console.log('Server exists:', srv.data.data.status, srv.data.data.blackholeStatus);
    if (srv.data.data.blackholeStatus !== 'CONNECTED') {
      console.log('Waiting for CONNECTED...');
      await waitForServer(sid);
    }
  }

  // Clear any lock
  await api('DELETE', `/v1/infra/servers/${sid}/lock`);

  // Deploy with inline archive
  console.log('\nDeploying with inline archive...');
  const deployBody = {
    source: { content: B64 },
    runtime: 'node20',
    install: 'cd /opt/app && npm install --production',
    start: 'cd /opt/app && npm start',
    port: 3000,
    env: {
      NODE_ENV: 'production',
      CHECKO_API_KEY: env.CHECKO_API_KEY || '',
      BITRIX_CLIENT_ID: env.BITRIX_CLIENT_ID || '',
      BITRIX_CLIENT_SECRET: env.BITRIX_CLIENT_SECRET || '',
      APP_URL: 'https://app-ca88bc62f33a.vibecode.bitrix24.tech',
    },
  };
  console.log('Archive size:', (B64.length * 3 / 4 / 1024).toFixed(0), 'KB decoded');
  const deploy = await api('POST', `/v1/infra/servers/${sid}/deploy?stream=false`, deployBody, 600000);
  console.log('Deploy result:', JSON.stringify(deploy.data, null, 2));
})();
