const https = require('https');

const SERVER_ID = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';
const VIBECODE_API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';
const GIT_URL = 'https://github.com/fghdhftt/111.git';

const body = JSON.stringify({
  command: 'deploy',
  params: {
    source: 'git',
    repository: GIT_URL,
    branch: 'master',
  }
});

const req = https.request({
  hostname: 'vibecode.bitrix24.tech',
  path: `/v1/infra/servers/${SERVER_ID}/exec`,
  method: 'POST',
  headers: {
    'X-API-Key': VIBECODE_API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': body.length,
  },
  timeout: 30000,
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log(`Status ${res.statusCode}: ${data.slice(0, 2000)}`));
});
req.on('error', e => console.error('Error:', e.message));
req.on('timeout', () => { req.destroy(); console.error('Timeout'); });
req.write(body);
req.end();
