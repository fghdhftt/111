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

const SID = 'da76a437-284c-47fa-8462-e72f896487e2';
const API_KEY = env.VIBECODE_API_KEY;

function api(method, path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path,
      method,
      headers: { 'X-API-Key': API_KEY },
      timeout: 15000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.end();
  });
}

(async () => {
  const logs = await api('GET', `/v1/infra/servers/${SID}/logs?service=app&lines=200`);
  console.log(logs);
})();
