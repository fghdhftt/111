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

function api(method, path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path,
      method,
      headers: { 'X-API-Key': API_KEY },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    req.end();
  });
}

async function main() {
  // Check server access policy
  const srv = await api('GET', `/v1/infra/servers/${SID}`);
  console.log('Server:', srv.data?.status, srv.data?.blackholeStatus, 'accessPolicy:', srv.data?.accessPolicy);

  // Check current access list
  const access = await api('GET', `/v1/infra/servers/${SID}/access`);
  console.log('Access:', JSON.stringify(access.data));

  // Check logs
  const logs = await api('GET', `/v1/infra/servers/${SID}/logs?lines=20`);
  const l = logs.data?.data || logs.data;
  console.log('Logs:', typeof l === 'string' ? l.slice(0, 1000) : JSON.stringify(l).slice(0, 1000));
}

main();
