const axios = require('axios');

const MULLVAD_API = 'https://api.mullvad.net/www/relays/wireguard/';
const MULLVAD_WG_API = 'https://api.mullvad.net/wg/';

let relaysCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const FALLBACK_RELAYS = [];

async function fetchRelays() {
  if (relaysCache && Date.now() - cacheTime < CACHE_TTL) {
    return relaysCache;
  }
  try {
    const { data } = await axios.get(MULLVAD_API, { timeout: 15000 });
    relaysCache = data;
    cacheTime = Date.now();
    return data;
  } catch (err) {
    if (relaysCache) return relaysCache;
    throw new Error(`Mullvad API недоступен: ${err.message}. Проверьте интернет-соединение.`);
  }
}

async function getCountries() {
  const relays = await fetchRelays();
  const countryMap = new Map();

  for (const relay of relays) {
    const code = relay.country_code?.toLowerCase();
    const name = relay.country_name;
    if (code && name && !countryMap.has(code)) {
      countryMap.set(code, {
        code,
        name,
        flag: getFlagEmoji(code),
        serverCount: 0,
      });
    }
    if (code && countryMap.has(code)) {
      countryMap.get(code).serverCount++;
    }
  }

  return Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function getServersByCountry(countryCode) {
  const relays = await fetchRelays();
  return relays
    .filter(r => r.country_code?.toLowerCase() === countryCode.toLowerCase())
    .map(r => ({
      hostname: r.hostname,
      location: r.city_name || r.country_name,
      countryCode: r.country_code?.toLowerCase(),
      publicKey: r.public_key,
      endpoint: `${r.ipv4_addr_in}:${r.port}`,
      multihopPort: r.multihop_port,
      owned: r.owned,
      provider: r.provider,
    }));
}

async function getWireGuardConfig(accountNumber, publicKey, serverEndpoint, serverPublicKey, serverPort = 51820) {
  const [serverIp] = serverEndpoint.split(':');
  const internalIp = '10.0.0.2';

  const config = `[Interface]
PrivateKey = <PRIVATE_KEY>
Address = ${internalIp}/32
DNS = 10.0.0.1

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverIp}:${serverPort}
AllowedIPs = 0.0.0.0/0, ::/0
`;

  return config;
}

async function generateConfig(accountNumber, publicKey, serverHostname) {
  try {
    const { data } = await axios.post(MULLVAD_WG_API, {
      account: accountNumber,
      pubkey: publicKey,
      hostname: serverHostname,
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  } catch (err) {
    throw new Error(`Mullvad API error: ${err.response?.data || err.message}`);
  }
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 0x1F1E6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

module.exports = {
  getCountries,
  getServersByCountry,
  generateConfig,
  getWireGuardConfig,
};
