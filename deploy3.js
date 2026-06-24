const https = require('https');

const API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';

function apiGet(path, authHeader, headerValue) {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    headers[authHeader] = headerValue;

    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path,
      method: 'GET',
      headers,
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 2000) }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.end();
  });
}

(async () => {
  const r1 = await apiGet('/v1/me', 'Authorization', `Bearer ${API_KEY}`);
  console.log('Bearer:', JSON.stringify(r1));
  const r2 = await apiGet('/v1/me', 'X-API-Key', API_KEY);
  console.log('X-API-Key:', JSON.stringify(r2));
})();
