const https = require('https');
const API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';
const SERVER_ID = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';

function exec(command, timeout = 30) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ command: 'exec', params: { command, timeout } });
    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path: `/v1/infra/servers/${SERVER_ID}/exec`,
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', 'Content-Length': body.length },
      timeout: (timeout + 10) * 1000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  const cmds = [
    'pwd',
    'ls -la /home/ubuntu/',
    'ls -la /app/ || echo "NO /APP"',
    'whoami',
    'which node npm git',
    'node --version',
    'npm --version',
  ];
  for (const cmd of cmds) {
    const r = await exec(cmd);
    const d = r.data || {};
    console.log(`$ ${cmd}\n  exit=${d.exitCode} out="${(d.stdout||'').slice(0,300)}" err="${(d.stderr||'').slice(0,300)}"\n`);
  }
})();
