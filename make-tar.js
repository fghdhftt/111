const fs = require('fs');
const path = require('path');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');

// Simple tar implementation for creating tar.gz
// tar format: https://en.wikipedia.org/wiki/Tar_(computing)#File_format

const ROOT = path.resolve(__dirname);
const EXCLUDE = new Set(['node_modules', '.git', 'deploy.tar.gz', 'deploy.zip', 'deploy.js', 'deploy4.js', 'deploy5.js', 'deploy6.js', 'deploy7.js', 'deploy8.js', 'deploy9.js', 'deploy10.js', 'deploy11.js']);

function pad(s, n) { return String(s).padStart(n, '0'); }

function tarHeader(name, size, type) {
  const buf = Buffer.alloc(512);
  const nameBuf = Buffer.from(name.slice(0, 100), 'utf-8');
  nameBuf.copy(buf, 0);
  // mode (octal)
  buf.write(pad('644', 7), 100, 7, 'utf-8');
  // uid
  buf.write(pad('0', 7), 108, 7, 'utf-8');
  // gid
  buf.write(pad('0', 7), 116, 7, 'utf-8');
  // size (octal)
  buf.write(pad(size.toString(8), 11), 124, 11, 'utf-8');
  // mtime (octal)
  buf.write(pad(Math.floor(Date.now() / 1000).toString(8), 11), 136, 11, 'utf-8');
  // checksum placeholder (spaces)
  buf.write('        ', 148, 8, 'utf-8');
  // type flag
  buf[156] = type === 'dir' ? 53 : 48; // '5' for dir, '0' for file
  // magic + version
  buf.write('ustar', 257, 5, 'utf-8');
  buf.write('00', 263, 2, 'utf-8');
  // checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += buf[i];
  buf.write(pad(sum.toString(8), 6), 148, 6, 'utf-8');
  buf[154] = 0x20;
  buf[155] = 0x20;
  return buf;
}

async function createTar(dir) {
  const chunks = [];
  let totalSize = 0;

  async function addEntry(filePath, stat) {
    const relPath = path.relative(dir, filePath).replace(/\\/g, '/');
    if (EXCLUDE.has(relPath) || EXCLUDE.has(path.basename(relPath))) return;

    if (stat.isDirectory()) {
      const header = tarHeader(relPath + '/', 0, 'dir');
      chunks.push(header);
      totalSize += 512;
      const entries = fs.readdirSync(filePath, { withFileTypes: true });
      for (const entry of entries) {
        await addEntry(path.join(filePath, entry.name), entry);
      }
    } else if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      const header = tarHeader(relPath, content.length, 'file');
      chunks.push(header);
      chunks.push(content);
      totalSize += 512 + content.length;
      // Pad to 512 bytes
      const padSize = (512 - (content.length % 512)) % 512;
      if (padSize > 0) {
        chunks.push(Buffer.alloc(padSize));
        totalSize += padSize;
      }
    }
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    await addEntry(path.join(dir, entry.name), entry);
  }

  // Two 512-byte zero blocks for end-of-archive
  chunks.push(Buffer.alloc(1024));
  totalSize += 1024;

  return Buffer.concat(chunks, totalSize);
}

(async () => {
  console.log('Creating tar archive...');
  const tarData = await createTar(ROOT);
  console.log(`Tar size: ${(tarData.length / 1024 / 1024).toFixed(2)} MB`);

  console.log('Compressing with gzip...');
  const gzipData = await new Promise((resolve, reject) => {
    const gzip = createGzip({ level: 6 });
    const bufs = [];
    gzip.on('data', c => bufs.push(c));
    gzip.on('end', () => resolve(Buffer.concat(bufs)));
    gzip.on('error', reject);
    gzip.end(tarData);
  });
  console.log(`Gzip size: ${(gzipData.length / 1024 / 1024).toFixed(2)} MB`);

  const outPath = path.join(ROOT, 'deploy.tar.gz');
  fs.writeFileSync(outPath, gzipData);
  console.log(`Written to: ${outPath}`);
  console.log(`Base64 length: ${gzipData.length}`);
})();
