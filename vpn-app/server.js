require('dotenv').config();
const express = require('express');
const path = require('path');
const vpn = require('./services/vpn-manager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/countries', async (req, res) => {
  try {
    const countries = await vpn.listCountries();
    res.json(countries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/servers', async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) return res.status(400).json({ error: 'country query param required' });
    const servers = await vpn.listServers(country);
    res.json(servers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/connect', async (req, res) => {
  try {
    const { country, server } = req.body;
    if (!country || !server) {
      return res.status(400).json({ error: 'country and server required' });
    }
    const result = await vpn.connectToServer(country, server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/disconnect', async (req, res) => {
  try {
    await vpn.disconnect();
    res.json({ status: 'disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const status = await vpn.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/configs', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const result = vpn.saveUserConfig(content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`VPN Manager running at http://localhost:${PORT}`);
});
