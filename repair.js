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

function api(method, path, body) {
  return new Promise((resolve) => {
    const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
    const opts = { hostname: 'vibecode.bitrix24.tech', path, method, headers, timeout: 30000 };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, raw: d }); } });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Call repair
  console.log('Calling repair...');
  const rep = await api('POST', `/v1/infra/servers/${SID}/repair`);
  console.log('Repair result:', JSON.stringify(rep.data || rep, null, 2));

  // Wait a bit then check status
  await new Promise(r => setTimeout(r, 5000));
  console.log('\nChecking repair status...');
  const status = await api('GET', `/v1/infra/servers/${SID}/repair-status`);
  console.log('Repair status:', JSON.stringify(status.data || status, null, 2));
})();
