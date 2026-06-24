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
    const headers = { 'X-API-Key': API_KEY };
    if (body) headers['Content-Type'] = 'application/json';
    const opts = { hostname: 'vibecode.bitrix24.tech', path, method, headers, timeout: 15000 };
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
  // Try repair with empty body
  console.log('Repair...');
  const rep = await api('POST', `/v1/infra/servers/${SID}/repair`, {});
  console.log('Repair:', JSON.stringify(rep.data || rep).slice(0, 500));

  await new Promise(r => setTimeout(r, 5000));

  // Check logs
  console.log('\nLogs...');
  const logs = await api('GET', `/v1/infra/servers/${SID}/logs?service=app&limit=200`);
  if (logs.data?.data?.logs) {
    const msgs = logs.data.data.logs.map(l => l.message).filter(Boolean);
    for (const m of msgs.slice(-50)) {
      if (m.includes('POST /install') || m.includes('placement') || m.includes('bind') || m.includes('error') || m.includes('Error')) {
        console.log(m);
      }
    }
  } else {
    console.log('Logs response:', JSON.stringify(logs.data || logs).slice(0, 1000));
  }

  // Check server status
  const srv = await api('GET', `/v1/infra/servers/${SID}`);
  console.log('\nServer:', JSON.stringify(srv.data?.data?.status, null, 2), JSON.stringify(srv.data?.data?.blackholeStatus, null, 2));
})();
