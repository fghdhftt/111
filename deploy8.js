const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (key) env[key] = val;
}

const API_KEY = env.VIBECODE_API_KEY;
const SERVER_ID = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';
const GIT_URL = 'https://github.com/fghdhftt/111/archive/refs/heads/master.tar.gz';

const body = JSON.stringify({
  source: { url: GIT_URL },
  runtime: 'node20',
  install: 'cd /opt/app && npm install && npm run build',
  start: 'cd /opt/app && npm start',
  port: 3000,
  env: {
    NODE_ENV: 'production',
    CHECKO_API_KEY: env.CHECKO_API_KEY || '',
    BITRIX_CLIENT_ID: env.BITRIX_CLIENT_ID || '',
    BITRIX_CLIENT_SECRET: env.BITRIX_CLIENT_SECRET || '',
    APP_URL: 'https://app-10dffeb6989a.vibecode.bitrix24.tech',
  },
});

console.log(`Deploying to server ${SERVER_ID}...\n`);
console.log(`Git archive: ${GIT_URL}`);
console.log(`Env keys: CHECKO_API_KEY=${env.CHECKO_API_KEY ? '✓ set' : '✗ MISSING'}, BITRIX_CLIENT_ID=${env.BITRIX_CLIENT_ID ? '✓ set' : '✗ MISSING'}, BITRIX_CLIENT_SECRET=${env.BITRIX_CLIENT_SECRET ? '✓ set' : '✗ MISSING'}\n`);

const req = https.request({
  hostname: 'vibecode.bitrix24.tech',
  path: `/v1/infra/servers/${SERVER_ID}/deploy?stream=false`,
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
  timeout: 600000, // 10 minutes
}, (res) => {
  console.log(`HTTP ${res.statusCode}`);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log('Raw response:', data);
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
