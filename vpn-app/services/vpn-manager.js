const wireguard = require('./wireguard');
const protonvpn = require('./protonvpn');

let currentConnection = null;

async function listCountries() {
  const configs = wireguard.listLocalConfigs();
  const countryMap = new Map();
  for (const cfg of configs) {
    const content = wireguard.readLocalConfig(cfg.name);
    if (!content) continue;
    const code = wireguard.parseConfigCountry(content);
    if (!countryMap.has(code)) {
      countryMap.set(code, {
        code,
        name: code.charAt(0).toUpperCase() + code.slice(1),
        flag: protonvpn.getFlagEmoji(code) || '🌍',
        serverCount: 0,
        source: 'local',
      });
    }
    countryMap.get(code).serverCount++;
  }
  const result = Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  if (result.length === 0) {
    throw new Error('Нет конфигов. Положите .conf файлы в папку configs/ или нажмите "Как добавить?"');
  }
  return result;
}

async function listServers(countryCode) {
  const configs = wireguard.listLocalConfigs();
  const results = [];
  for (const cfg of configs) {
    const content = wireguard.readLocalConfig(cfg.name);
    if (!content) continue;
    const code = wireguard.parseConfigCountry(content);
    if (code === countryCode.toLowerCase()) {
      results.push({
        name: cfg.name,
        hostname: cfg.name,
        location: code.toUpperCase(),
        source: 'local',
      });
    }
  }
  return results;
}

async function connectToServer(countryCode, serverId) {
  if (currentConnection) {
    throw new Error('Already connected. Disconnect first.');
  }

  const localConfig = wireguard.listLocalConfigs().find(c => c.name === serverId);
  if (!localConfig) {
    throw new Error(`Config ${serverId} not found`);
  }

  const tunnelName = `local-${serverId}`;
  await wireguard.connect(tunnelName);

  currentConnection = {
    tunnelName,
    countryCode,
    server: serverId,
    connectedAt: new Date().toISOString(),
    source: 'local',
  };
  return currentConnection;
}

async function disconnect() {
  if (!currentConnection) {
    throw new Error('Not connected');
  }
  try {
    await wireguard.disconnect(currentConnection.tunnelName);
  } finally {
    currentConnection = null;
  }
}

async function getStatus() {
  const interfaces = await wireguard.getStatus();
  return {
    connected: currentConnection !== null,
    connection: currentConnection,
    interfaces,
  };
}

function saveUserConfig(content) {
  const nsMatch = content.match(/#\s*Name:\s*(.+)/i);
  const countryMatch = content.match(/#\s*Country:\s*(\S+)/i);
  const country = countryMatch ? countryMatch[1].toLowerCase() : 'unknown';
  const name = nsMatch ? nsMatch[1].trim().toLowerCase().replace(/\s+/g, '-') : `${country}-${Date.now()}`;
  wireguard.saveConfig(name, content);
  return { name, country };
}

module.exports = {
  saveUserConfig,
  listCountries,
  listServers,
  connectToServer,
  disconnect,
  getStatus,
};
