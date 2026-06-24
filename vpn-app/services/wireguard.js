const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CONFIGS_DIR = path.join(__dirname, '..', 'configs');

if (!fs.existsSync(CONFIGS_DIR)) {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
}

function getWireGuardPath() {
  const envPath = process.env.WIREGUARD_PATH;
  if (envPath) return envPath;
  if (os.platform() === 'win32') {
    return 'C:\\Program Files\\WireGuard';
  }
  return '/usr/bin';
}

function wgCommand(...args) {
  const wgDir = getWireGuardPath();
  const wg = path.join(wgDir, 'wg.exe');
  return new Promise((resolve, reject) => {
    exec(`"${wg}" ${args.join(' ')}`, { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(new Error(`wg error: ${err.message}`));
      resolve(stdout.trim());
    });
  });
}

function wireGuardExe(...args) {
  const wgDir = getWireGuardPath();
  const exe = path.join(wgDir, 'wireguard.exe');
  return new Promise((resolve, reject) => {
    exec(`"${exe}" ${args.join(' ')}`, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.trim() || err.message));
      resolve(stdout.trim());
    });
  });
}

function generateKeyPair() {
  return new Promise((resolve, reject) => {
    const wg = path.join(getWireGuardPath(), 'wg.exe');
    exec(`"${wg}" genkey`, { timeout: 5000 }, (err, stdout) => {
      if (err) return reject(new Error('Failed to generate key: ' + err.message));
      const privateKey = stdout.trim();
      exec(`echo ${privateKey} | "${wg}" pubkey`, { timeout: 5000 }, (err, stdout) => {
        if (err) return reject(new Error('Failed to derive public key: ' + err.message));
        resolve({ privateKey, publicKey: stdout.trim() });
      });
    });
  });
}

async function getStatus() {
  try {
    const output = await wgCommand('show');
    const lines = output.split('\n');
    const interfaces = [];
    let cur = null;

    for (const line of lines) {
      const t = line.trim();
      const mIface = t.match(/^interface:\s+(.+)$/i);
      if (mIface) {
        if (cur) interfaces.push(cur);
        cur = { name: mIface[1], peers: [] };
        continue;
      }
      const mPeer = t.match(/^peer:\s+(.+)$/i);
      if (mPeer && cur) {
        cur.peers.push({ publicKey: mPeer[1] });
        continue;
      }
      if (!cur || cur.peers.length === 0) continue;
      const lastPeer = cur.peers[cur.peers.length - 1];
      const mEp = t.match(/^endpoint:\s+(.+)$/i);
      if (mEp) { lastPeer.endpoint = mEp[1]; continue; }
      const mIps = t.match(/^allowed ips:\s+(.+)$/i);
      if (mIps) { lastPeer.allowedIps = mIps[1]; continue; }
      const mHs = t.match(/^latest handshake:\s+(.+)$/i);
      if (mHs) { lastPeer.latestHandshake = mHs[1]; continue; }
      const mTr = t.match(/^transfer:\s+(.+)$/i);
      if (mTr) { lastPeer.transfer = mTr[1]; continue; }
    }
    if (cur) interfaces.push(cur);
    return interfaces;
  } catch {
    return [];
  }
}

function saveConfig(name, content) {
  const filePath = path.join(CONFIGS_DIR, `${name}.conf`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function listLocalConfigs() {
  try {
    return fs.readdirSync(CONFIGS_DIR)
      .filter(f => f.endsWith('.conf'))
      .map(f => ({
        name: f.replace(/\.conf$/, ''),
        path: path.join(CONFIGS_DIR, f),
      }));
  } catch {
    return [];
  }
}

function readLocalConfig(name) {
  const filePath = path.join(CONFIGS_DIR, `${name}.conf`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function parseConfigCountry(content) {
  const match = content.match(/#\s*Country:\s*(\S+)/i);
  if (match) return match[1].toLowerCase();
  const name = content.match(/^#\s*(\w+)/m);
  if (name) return name[1].toLowerCase();
  return 'unknown';
}

function deleteConfig(name) {
  const filePath = path.join(CONFIGS_DIR, `${name}.conf`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function connect(name) {
  const configPath = path.join(CONFIGS_DIR, `${name}.conf`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${name}`);
  }
  return await wireGuardExe('/installtunnelservice', configPath);
}

async function disconnect(name) {
  return await wireGuardExe('/uninstalltunnelservice', name);
}

module.exports = {
  generateKeyPair,
  getStatus,
  saveConfig,
  listLocalConfigs,
  readLocalConfig,
  parseConfigCountry,
  deleteConfig,
  connect,
  disconnect,
};
