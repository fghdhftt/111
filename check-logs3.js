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

function api(method, path, body) {
  return new Promise((resolve) => {
    const headers = { 'X-API-Key': env.VIBECODE_API_KEY };
    if (body) headers['Content-Type'] = 'application/json';
    const opts = { hostname: 'vibecode.bitrix24.tech', path, method, headers, timeout: 15000 };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const logResp = await api('GET', '/v1/infra/servers/da76a437-284c-47fa-8462-e72f896487e2/logs?service=app&limit=200');
  console.log('Response keys:', Object.keys(logResp));
  if (logResp.data) console.log('data keys:', Object.keys(logResp.data));
  if (logResp.data?.data) console.log('data.data keys:', Object.keys(logResp.data.data));
  console.log('JSON:', JSON.stringify(logResp).slice(0, 3000));
})();
