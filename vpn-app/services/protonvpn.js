// ProtonVPN API - отключено из-за сложной SRP-авторизации
// Используйте локальные .conf файлы в папке configs/

function isConfigured() {
  return false;
}

async function getCountries() {
  return [];
}

async function getServersByCountry(countryCode) {
  return [];
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 0x1F1E6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

module.exports = {
  isConfigured,
  getCountries,
  getServersByCountry,
  getFlagEmoji,
};
