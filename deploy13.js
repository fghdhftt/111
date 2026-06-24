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

async function exec(command, timeout = 30) {
  return api('POST', `/v1/infra/servers/${SID}/exec`, {
    command: 'exec',
    params: { command, timeout }
  }, (timeout + 10) * 1000);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const cmds = [
    'ls -la /opt/app/ 2>&1 || echo "NO-OPT-APP"',
    'ls -la /opt/app/111-master/ 2>&1 || echo "NO-SUBDIR"',
    'ls /opt/app/111-master/package.json 2>&1 || echo "NO-PACKAGE"',
    'ls /opt/app/111-master/backend/dist/index.js 2>&1 || echo "NO-BACKEND-DIST"',
  ];
  for (const cmd of cmds) {
    await sleep(7000);
    const r = await exec(cmd);
    const d = r.data?.data || {};
    console.log(`$ ${cmd.slice(0,60)}`);
    console.log(`  exit=${d.exitCode} stdout=${(d.stdout||'').slice(0,300)} stderr=${(d.stderr||'').slice(0,200)}`);
  }
})();
