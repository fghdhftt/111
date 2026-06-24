const https = require('https');

const SERVER_ID = 'ce1b0955-9d89-44cd-80a1-31080864a3e9';
const API_KEY = 'vibe_app_local_6a227c268180a0_11347613_uEg2R4rekc2etivqrsgSAbce2Wag20m3egFRrZWdH5T1SNGhNN_01a2bf';
const GIT_URL = 'https://github.com/fghdhftt/111.git';

const body = JSON.stringify({
  command: 'deploy',
  params: {
    source: 'git',
    repository: GIT_URL,
    branch: 'master',
  }
});

function tryDeploy(authHeader, headerValue) {
  return new Promise((resolve) => {
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
    };
    headers[authHeader] = headerValue;

    const req = https.request({
      hostname: 'vibecode.bitrix24.tech',
      path: `/v1/infra/servers/${SERVER_ID}/exec`,
      method: 'POST',
      headers,
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ auth: `${authHeader}: ${headerValue.slice(0, 20)}...`, status: res.statusCode, data: data.slice(0, 300) }));
    });
    req.on('error', e => resolve({ auth: `${authHeader}: ${headerValue.slice(0, 20)}...`, error: e.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  const results = await Promise.all([
    tryDeploy('Authorization', `Bearer ${API_KEY}`),
    tryDeploy('Authorization', `${API_KEY}`),
    tryDeploy('X-API-Key', API_KEY),
    tryDeploy('x-api-key', API_KEY),
    tryDeploy('api-key', API_KEY),
  ]);
  results.forEach(r => console.log(JSON.stringify(r)));
})();
