const https = require('https');
const API_KEY = 'vibe_api_8zQVST6O1pi6egKb3F32l3Erik97GGT7_e5a384';

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
  // Step 1: Create a new server
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
    return;
  }
  const sid = create.data.data.id;
  const subdomain = create.data.data.subdomain;
  console.log(`  Server ID: ${sid}`);
  console.log(`  URL: https://${subdomain}.vibecode.bitrix24.tech`);

  // Step 2: Wait for provisioning
  console.log('\n2. Waiting for server to be ready...');
  const serverInfo = await waitForServer(sid);
  console.log('  Server is ready!');

  // Step 3: Deploy the app
  console.log('\n3. Deploying app...');
  const deploy = await api('POST', `/v1/infra/servers/${sid}/deploy?stream=false`, {
    source: { url: 'https://github.com/fghdhftt/111/archive/refs/heads/master.tar.gz' },
    runtime: 'node20',
    install: 'cd /opt/app && npm install && npm run build',
    start: 'cd /opt/app && npm start',
    port: 3000,
    env: {
      NODE_ENV: 'production',
      CHECKO_API_KEY: process.env.CHECKO_API_KEY || '',
      BITRIX_CLIENT_ID: process.env.BITRIX_CLIENT_ID || '',
      BITRIX_CLIENT_SECRET: process.env.BITRIX_CLIENT_SECRET || '',
      APP_URL: `https://${subdomain}.vibecode.bitrix24.tech`,
    },
  }, 600000);
  console.log('Deploy result:', JSON.stringify(deploy.data, null, 2));
})();
