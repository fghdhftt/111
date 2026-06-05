const https = require('https');
const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\Роза\\Projects\\bitrix24-counterparty-check-deploy.zip';
const file = fs.readFileSync(filePath);
const boundary = '----' + Date.now();

const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="deploy.zip"\r\nContent-Type: application/zip\r\n\r\n`;
const footer = `\r\n--${boundary}--\r\n`;

const buf = Buffer.concat([
  Buffer.from(header),
  file,
  Buffer.from(footer),
]);

function tryUpload(hostname, pathname) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      method: 'POST',
      path: pathname,
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': buf.length,
      },
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ hostname, status: res.statusCode, data }));
    });
    req.on('error', e => reject({ hostname, error: e.message }));
    req.on('timeout', () => { req.destroy(); reject({ hostname, error: 'timeout' }); });
    req.write(buf);
    req.end();
  });
}

const services = [
  ['file.io', '/'],
  ['transfer.sh', '/'],
  ['0x0.st', '/'],
  ['catbox.moe', '/user/api.php?reqtype=fileupload'],
];

(async () => {
  for (const [host, p] of services) {
    try {
      const result = await tryUpload(host, p);
      console.log(`${host}: ${result.status} -> ${result.data.slice(0, 200)}`);
    } catch (e) {
      console.log(`${host}: FAILED (${e.error})`);
    }
  }
})();
