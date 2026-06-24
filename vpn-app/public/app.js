let countries = [];
let selectedCountry = null;
let statusInterval = null;

function $(id) { return document.getElementById(id); }

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function loadCountries() {
  const list = $('countryList');
  $('configCount').textContent = '...';
  try {
    countries = await api('/api/countries');
    $('configCount').textContent = countries.reduce((s, c) => s + c.serverCount, 0);
    renderCountries(countries);
    if (countries.length > 0) {
      $('welcomePanel').classList.remove('hidden');
    }
  } catch (err) {
    list.innerHTML = `<div class="error-msg">${err.message}</div>`;
    $('configCount').textContent = '0';
  }
}

function renderCountries(list) {
  const container = $('countryList');
  if (list.length === 0) {
    container.innerHTML = '<div class="loading">Нет конфигов. Нажмите "Как добавить?"</div>';
    return;
  }
  container.innerHTML = list.map(c => `
    <div class="country-item ${selectedCountry?.code === c.code ? 'active' : ''}"
         data-code="${c.code}" onclick="selectCountry('${c.code}')">
      <span class="country-flag">${c.flag || '🌍'}</span>
      <span class="country-name">${c.name}</span>
      <span class="country-count">${c.serverCount}</span>
    </div>
  `).join('');
}

async function selectCountry(code) {
  selectedCountry = countries.find(c => c.code === code) || null;
  renderCountries(countries);

  $('welcomePanel').classList.add('hidden');
  $('setupGuide').classList.add('hidden');
  $('connectionInfo').classList.add('hidden');
  const panel = $('serverPanel');
  panel.classList.remove('hidden');
  $('selectedCountry').textContent = `${selectedCountry.flag || '🌍'} ${selectedCountry.name}`;
  $('serverList').innerHTML = '<div class="loading">Загрузка...</div>';

  try {
    const servers = await api(`/api/servers?country=${code}`);
    renderServers(servers);
  } catch (err) {
    $('serverList').innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

function renderServers(servers) {
  const container = $('serverList');
  if (servers.length === 0) {
    container.innerHTML = '<div class="loading">Нет серверов в этой стране</div>';
    return;
  }
  container.innerHTML = servers.map(s => {
    const handle = s.hostname || s.name || s.id;
    return `<div class="server-item">
      <div class="server-info">
        <span class="server-name">${handle}</span>
        <span class="server-location">${s.location || s.countryCode || ''}</span>
      </div>
      <button class="btn btn-primary" onclick="connect('${selectedCountry.code}', '${handle}')">
        Подключиться
      </button>
    </div>`;
  }).join('');
}

async function connect(country, server) {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Подключение...'; }
  try {
    const result = await api('/api/connect', {
      method: 'POST',
      body: JSON.stringify({ country, server }),
    });
    $('serverPanel').classList.add('hidden');
    $('setupGuide').classList.add('hidden');
    $('welcomePanel').classList.add('hidden');
    updateConnectionInfo(result);
    updateStatus(true);
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Подключиться'; }
  }
}

async function disconnect() {
  try {
    await api('/api/disconnect', { method: 'POST' });
    $('connectionInfo').classList.add('hidden');
    $('welcomePanel').classList.remove('hidden');
    updateStatus(false);
    loadCountries();
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
}

function updateConnectionInfo(conn) {
  const panel = $('connectionInfo');
  panel.classList.remove('hidden');
  const country = countries.find(c => c.code === conn.countryCode);
  $('connCountry').textContent = country?.name || conn.countryCode;
  $('connServer').textContent = conn.server;
  $('connTime').textContent = new Date(conn.connectedAt).toLocaleString();
}

function updateStatus(connected) {
  $('statusDot').classList.toggle('connected', connected);
  $('statusText').textContent = connected ? 'Подключено' : 'Отключено';
}

async function checkStatus() {
  try {
    const status = await api('/api/status');
    updateStatus(status.connected);
    if (status.connected && status.connection) {
      if ($('connectionInfo').classList.contains('hidden')) {
        updateConnectionInfo(status.connection);
      }
    }
  } catch {}
}

async function saveConfig() {
  const textarea = $('configInput');
  const content = textarea.value.trim();
  const result = $('saveResult');
  if (!content) {
    result.className = 'save-result error';
    result.textContent = 'Вставьте конфиг';
    return;
  }
  try {
    const res = await api('/api/configs', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    result.className = 'save-result success';
    result.textContent = `Сохранён как ${res.name}.conf`;
    textarea.value = '';
    loadCountries();
  } catch (err) {
    result.className = 'save-result error';
    result.textContent = err.message;
  }
}

$('countrySearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderCountries(countries.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  ));
});

$('disconnectBtn').addEventListener('click', disconnect);

function showSetup() {
  $('welcomePanel').classList.add('hidden');
  $('serverPanel').classList.add('hidden');
  $('connectionInfo').classList.add('hidden');
  $('setupGuide').classList.remove('hidden');
}

$('showSetupBtn').addEventListener('click', showSetup);
$('showSetupBtn2').addEventListener('click', showSetup);
$('backFromSetup').addEventListener('click', () => {
  $('setupGuide').classList.add('hidden');
  $('welcomePanel').classList.remove('hidden');
});
$('saveConfigBtn').addEventListener('click', saveConfig);

loadCountries();
checkStatus();
statusInterval = setInterval(checkStatus, 5000);
