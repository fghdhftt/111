const https = require('https');
const fs = require('fs');
const path = require('path');

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
const SID = 'da76a437-284c-47fa-8462-e72f896487e2';
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
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Check server status
  const srv = await api('GET', `/v1/infra/servers/${SID}`);
  if (!srv.data?.success) {
    console.error('Server not found:', JSON.stringify(srv.data));
    return;
  }
  console.log('Server:', srv.data.data.status, srv.data.data.blackholeStatus, srv.data.data.subdomain);

  // Clear any lock from previous deploy
  await api('DELETE', `/v1/infra/servers/${SID}/lock`);

  // Redeploy with updated credentials
  console.log('\nRedeploying...');
  const deployBody = {
    source: { content: B64 },
    runtime: 'node20',
    install: 'cd /opt/app && npm install --production',
    start: 'cd /opt/app && npm start',
    port: 3000,
    env: {
      NODE_ENV: 'production',
      CHECKO_API_KEY: env.CHECKO_API_KEY || '',
      VIBECODE_API_KEY: env.VIBECODE_API_KEY || '',
      BITRIX_CLIENT_ID: env.BITRIX_CLIENT_ID || '',
      BITRIX_CLIENT_SECRET: env.BITRIX_CLIENT_SECRET || '',
      APP_URL: `https://${srv.data.data.subdomain}.vibecode.bitrix24.tech`,
    },
  };
  console.log('New BITRIX_CLIENT_ID:', deployBody.env.BITRIX_CLIENT_ID);
  console.log('New APP_URL:', deployBody.env.APP_URL);

  const deploy = await api('POST', `/v1/infra/servers/${SID}/deploy?stream=false`, deployBody, 600000);
  console.log('Deploy result:', JSON.stringify(deploy.data, null, 2));
})();
