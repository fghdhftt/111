const https = require('https');
const API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';
const SERVER_ID = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';

async function exec(command, timeout = 120) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      command: 'exec',
      params: { command, timeout }
    });
    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path: `/v1/infra/servers/${SERVER_ID}/exec`,
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
      timeout: (timeout + 10) * 1000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  // Step 1: Clone repo
  console.log('1. Cloning repository...');
  const r1 = await exec('cd /home/ubuntu && git clone https://github.com/fghdhftt/111.git app 2>&1 || (cd /app && git pull 2>&1)');
  console.log('Clone:', r1.status, r1.data?.data?.stdout?.slice(0, 500), r1.data?.data?.stderr?.slice(0, 500));

  if (r1.data?.data?.exitCode !== 0) {
    console.log('Clone failed or already exists, trying pull...');
  }

  // Step 2: Check what's in /app
  const r2 = await exec('ls -la /app/ 2>&1');
  console.log('Contents:', JSON.stringify(r2.data));
})();
