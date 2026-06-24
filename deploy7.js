const https = require('https');
const API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';
const SID = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';

function exec(cmd) {
  return new Promise((resolve) => {
    const b = JSON.stringify({ command: 'exec', params: { command: cmd, timeout: 10 } });
    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path: `/v1/infra/servers/${SID}/exec`,
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      timeout: 20000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(cmd + ': ' + d);
        resolve();
      });
    });
    req.write(b);
    req.end();
  });
}

async function main() {
  await exec('nobody_cmd_xyz');
  await sleep(7000);
  await exec('ls');
  await sleep(7000);
  await exec('cat /etc/os-release');
  await sleep(7000);
  await exec('id');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => console.error(e));
