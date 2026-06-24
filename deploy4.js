const https = require('https');
const API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';

function api(method, path, body) {
  return new Promise((resolve) => {
    const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
    const opts = {
      hostname: 'vibecode.bitrix24.tech',
      path,
      method,
      headers,
      timeout: 10000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Get full API info
  const me = await api('GET', '/v1/me');
  console.log('/v1/me:', me.status, me.data.slice(0, 3000));

  // Try different deploy endpoints
  const sid = 'f8c4fee0-47c0-4ea0-83ca-0d2d148630fa';
  const endpoints = [
    `/v1/infra/servers/${sid}/deploy`,
    `/v1/infra/servers/${sid}/git`,
    `/v1/infra/servers/${sid}`,
    `/v1/apps`,
    `/v1/exec`,
  ];
  for (const ep of endpoints) {
    const r = await api('GET', ep);
    if (r.status !== 404) console.log(`${ep}: ${r.status} ${r.data.slice(0, 200)}`);
  }
})();
