const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    tracking: {}, hist: {}, discMap: {}, agList: [], dcList: []
  }, null, 2));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

app.get('/api/state', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); }
  catch (e) { res.json({ tracking: {}, hist: {}, discMap: {}, agList: [], dcList: [] }); }
});

app.post('/api/state', (req, res) => {
  try {
    const cur = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (req.body.tracking) cur.tracking = req.body.tracking;
    if (req.body.discMap) cur.discMap = req.body.discMap;
    if (req.body.agList) cur.agList = req.body.agList;
    if (req.body.dcList) cur.dcList = req.body.dcList;
    if (req.body.hist) Object.keys(req.body.hist).forEach(d => { cur.hist[d] = req.body.hist[d]; });
    cur._lastSaved = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(cur));
    res.json({ ok: true, dates: Object.keys(cur.hist).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/track', (req, res) => {
  try {
    const { handle, field, value } = req.body;
    const cur = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!cur.tracking[handle]) cur.tracking[handle] = {};
    cur.tracking[handle][field] = value;
    cur._lastSaved = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(cur));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/history', (req, res) => {
  try {
    const { date, snapshot } = req.body;
    const cur = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    cur.hist[date] = snapshot;
    cur._lastSaved = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(cur));
    res.json({ ok: true, dates: Object.keys(cur.hist).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Start web server first
app.listen(PORT, () => {
  console.log(`[Tracker] Running on port ${PORT}`);

  // Start Discord bot AFTER web server is ready
  // Pass BOT_PORT env so bot.js uses a different port if it has its own server
  const { spawn } = require('child_process');
  const botPath = path.join(__dirname, 'bot.js');
  if (fs.existsSync(botPath)) {
    const bot = spawn('node', [botPath], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '10001' } // give bot a different port
    });
    bot.on('error', (e) => console.log('[Bot] Error:', e.message));
    bot.on('exit', (code) => {
      console.log('[Bot] Exited with code', code);
      // Restart bot if it crashes
      if (code !== 0) {
        setTimeout(() => {
          console.log('[Bot] Restarting...');
          spawn('node', [botPath], { stdio: 'inherit', env: { ...process.env, PORT: '10001' } });
        }, 5000);
      }
    });
    console.log('[Bot] Discord bot started');
  }
});
