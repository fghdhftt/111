const https = require('https');

const API_KEY = 'vibe_api_8zQVST6O1pi6egKb3F32lE3rkI97GGT7_e5a384';
const SERVER_ID = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';

async function api(method, path, body, timeoutMs) {
  return new Promise((resolve) => {
    const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
    const opts = {
      hostname: 'vibecode.bitrix24.tech',
      path,
      method,
      headers,
      timeout: timeoutMs || 15000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Check if vibe_api_ key can access this server
  const me = await api('GET', '/v1/me');
  console.log('/v1/me success:', me.data?.success === true);
  console.log('keys:', (me.data?.data?.keys || []).map(k => k.keyType + ':' + k.key.slice(0, 20)));
  console.log('servers create available:', me.data?.data?.capabilities?.servers?.create?.available);

  const srv = await api('GET', `/v1/infra/servers/${SERVER_ID}`);
  console.log('\nGET server:', srv.status, srv.data?.success === true ? 'OK' : 'FAIL');
  console.log(srv.data?.error || 'server status: ' + srv.data?.data?.status);

  if (srv.data?.success) {
    // Try deploy with vibe_api_ key
    const deploy = await api('POST', `/v1/infra/servers/${SERVER_ID}/deploy?stream=false`, {
      source: { url: 'https://github.com/fghdhftt/111/archive/refs/heads/master.tar.gz' },
      runtime: 'node20',
      install: 'cd /opt/app && npm install && npm run build',
      start: 'cd /opt/app && npm start',
      port: 3000,
    }, 600000);
    console.log('\nDeploy:', deploy.status);
    if (deploy.data) console.log(JSON.stringify(deploy.data, null, 2));
  }
})();
