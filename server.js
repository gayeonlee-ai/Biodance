const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize state file if not exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    tracking: {},
    hist: {},
    discMap: {},
    agList: [],
    dcList: []
  }, null, 2));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve tracker at root too
app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

// GET state
app.get('/api/state', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (e) {
    res.json({ tracking: {}, hist: {}, discMap: {}, agList: [], dcList: [] });
  }
});

// POST state (full save)
app.post('/api/state', (req, res) => {
  try {
    const current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Merge: incoming data overwrites
    if (req.body.tracking) current.tracking = req.body.tracking;
    if (req.body.discMap) current.discMap = req.body.discMap;
    if (req.body.agList) current.agList = req.body.agList;
    if (req.body.dcList) current.dcList = req.body.dcList;
    // History: merge (don't overwrite old dates)
    if (req.body.hist) {
      Object.keys(req.body.hist).forEach(d => { current.hist[d] = req.body.hist[d]; });
    }
    current._lastSaved = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(current));
    res.json({ ok: true, dates: Object.keys(current.hist).length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST single tracking update (lightweight - for checkbox clicks)
app.post('/api/track', (req, res) => {
  try {
    const { handle, field, value } = req.body;
    const current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!current.tracking[handle]) current.tracking[handle] = {};
    current.tracking[handle][field] = value;
    current._lastSaved = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(current));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST history snapshot (when CSV is uploaded)
app.post('/api/history', (req, res) => {
  try {
    const { date, snapshot } = req.body;
    const current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    current.hist[date] = snapshot;
    current._lastSaved = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(current));
    res.json({ ok: true, dates: Object.keys(current.hist).length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start Express
app.listen(PORT, () => {
  console.log(`[Tracker] http://localhost:${PORT}/tracker`);
});

// Start Discord bot (existing bot.js)
try {
  require('./bot.js');
  console.log('[Bot] Discord bot loaded');
} catch (e) {
  console.log('[Bot] bot.js not found or error:', e.message);
}
