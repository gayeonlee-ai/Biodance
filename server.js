const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 10000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'gayeonlee-ai/Biodance';
const GITHUB_FILE = 'data/state.json';
const LOCAL_FILE = path.join(__dirname, 'data', 'state.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const EMPTY = { tracking: {}, hist: {}, discMap: {}, agList: [], dcList: [], tipsLog: [] };
let STATE = null; // In-memory state
let savePending = false;
let lastSHA = null;

// ── GitHub Read ──
function ghRead(cb) {
  if (!GITHUB_TOKEN) return cb(null, EMPTY, null);
  const opts = {
    hostname: 'api.github.com', method: 'GET',
    path: '/repos/' + GITHUB_REPO + '/contents/' + GITHUB_FILE,
    headers: { 'Authorization': 'token ' + GITHUB_TOKEN, 'User-Agent': 'bio', 'Accept': 'application/vnd.github.v3+json' }
  };
  https.request(opts, res => {
    let raw = ''; res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const j = JSON.parse(raw);
        if (res.statusCode === 404 || !j.content) return cb(null, EMPTY, null);
        cb(null, JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), j.sha);
      } catch(e) { cb(null, EMPTY, null); }
    });
  }).on('error', () => cb(null, EMPTY, null)).end();
}

// ── GitHub Write (always fresh SHA) ──
function ghWrite(data, cb) {
  if (!GITHUB_TOKEN) return cb(new Error('no token'));
  // Step 1: Get fresh SHA
  ghRead((err, _cur, sha) => {
    const content = Buffer.from(JSON.stringify(data)).toString('base64');
    const body = JSON.stringify({
      message: 'auto ' + new Date().toISOString().slice(0, 19),
      content: content,
      ...(sha ? { sha } : {})
    });
    const opts = {
      hostname: 'api.github.com', method: 'PUT',
      path: '/repos/' + GITHUB_REPO + '/contents/' + GITHUB_FILE,
      headers: { 'Authorization': 'token ' + GITHUB_TOKEN, 'User-Agent': 'bio', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try { lastSHA = JSON.parse(raw).content.sha; } catch(e){}
          return cb(null);
        }
        console.log('[GH] Write failed ' + res.statusCode);
        // Retry once with fresh SHA
        if (res.statusCode === 409) {
          console.log('[GH] 409 retry...');
          setTimeout(() => ghWrite(data, cb), 1500);
        } else { cb(new Error('gh_' + res.statusCode)); }
      });
    });
    req.on('error', cb);
    req.write(body);
    req.end();
  });
}

// ── Save queue: debounce writes to avoid 409 ──
let saveTimer = null;
function queueSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 2000); // batch saves, wait 2s
}
function doSave() {
  if (!STATE) return;
  STATE._lastSaved = new Date().toISOString();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(STATE));
  ghWrite(STATE, err => {
    if (err) console.log('[GH] Save error: ' + err.message);
    else console.log('[GH] Saved OK');
  });
}

// ── Load on startup ──
function loadState(cb) {
  ghRead((err, data, sha) => {
    lastSHA = sha;
    if (data && Object.keys(data.tracking || {}).length > 0) {
      STATE = data;
      console.log('[GH] Loaded: ' + Object.keys(data.tracking).length + ' creators, ' + Object.keys(data.hist || {}).length + ' dates');
    } else if (fs.existsSync(LOCAL_FILE)) {
      try { STATE = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); console.log('[Local] Loaded'); } catch(e) { STATE = EMPTY; }
    } else { STATE = EMPTY; }
    cb();
  });
}

// ── Express ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// NO CACHE for anything
app.use(function(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

// ── Tips Tracking ─────────────────────────────────────────────
// Config: Set your Google Docs URL here
const TIPS_URLS = {
  default: process.env.TIPS_URL || 'https://docs.google.com/document/d/YOUR_DOC_ID/edit?usp=sharing'
};

// GET /tips/:channel — track click + redirect to doc
app.get('/tips/:channel', (req, res) => {
  const ch = req.params.channel || 'unknown';
  const u = (req.query.u || 'anonymous').toLowerCase();
  const docUrl = req.query.doc || TIPS_URLS[ch] || TIPS_URLS.default;
  if (!STATE) STATE = EMPTY;
  if (!STATE.tipsLog) STATE.tipsLog = [];
  STATE.tipsLog.push({
    user: u,
    channel: ch,
    time: new Date().toISOString(),
    doc: docUrl.substring(0, 60)
  });
  // Keep last 5000 entries
  if (STATE.tipsLog.length > 5000) STATE.tipsLog = STATE.tipsLog.slice(-5000);
  queueSave();
  res.redirect(docUrl);
});

// GET /api/tips-log — return tracking data
app.get('/api/tips-log', (req, res) => {
  res.json((STATE && STATE.tipsLog) || []);
});

// POST /api/tips-url — update the Google Docs URL
app.post('/api/tips-url', (req, res) => {
  if (req.body.url) {
    TIPS_URLS.default = req.body.url;
    if (req.body.channel) TIPS_URLS[req.body.channel] = req.body.url;
  }
  res.json({ ok: true, urls: TIPS_URLS });
});

// ── Express Routes ─────────────────────────────────────────────

app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

app.get('/api/state', (req, res) => {
  res.json(STATE || EMPTY);
});

app.post('/api/state', (req, res) => {
  if (!STATE) STATE = EMPTY;
  if (req.body.tracking) STATE.tracking = req.body.tracking;
  if (req.body.discMap) STATE.discMap = req.body.discMap;
  if (req.body.agList) STATE.agList = req.body.agList;
  if (req.body.dcList) STATE.dcList = req.body.dcList;
  if (req.body.hist) {
    if (!STATE.hist) STATE.hist = {};
    Object.keys(req.body.hist).forEach(d => { STATE.hist[d] = req.body.hist[d]; });
  }
  // Save locally immediately, queue GitHub write
  STATE._lastSaved = new Date().toISOString();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(STATE));
  queueSave();
  res.json({ ok: true, storage: 'queued', dates: Object.keys(STATE.hist || {}).length });
});

// Bot endpoints
app.post('/api/approve', (req, res) => {
  const { username, tiktok, tier } = req.body;
  if (!username || !tiktok) return res.status(400).json({ ok: false });
  if (!STATE) STATE = EMPTY;
  if (!STATE.discMap) STATE.discMap = {};
  if (!STATE.tracking) STATE.tracking = {};
  STATE.discMap[username] = tiktok;
  if (!STATE.tracking[tiktok]) STATE.tracking[tiktok] = {};
  STATE.tracking[tiktok].dj = true;
  STATE.tracking[tiktok].uname = username;
  if (tier === 'new') STATE.tracking[tiktok].cn = true;
  else if (tier === 'active') STATE.tracking[tiktok].ca = true;
  else if (tier === 'vip' || tier === 'vvip') STATE.tracking[tiktok].cv = true;
  queueSave();
  console.log('[Approve] ' + username + ' → @' + tiktok);
  res.json({ ok: true, tiktok, username });
});

app.post('/api/role-assign', (req, res) => {
  const { username, nickname, tier } = req.body;
  if (!STATE) return res.json({ ok: true });
  const tiktok = (STATE.discMap || {})[username] || (STATE.discMap || {})[nickname] || nickname;
  if (tiktok && STATE.tracking && STATE.tracking[tiktok]) {
    if (tier === 'new') STATE.tracking[tiktok].cn = true;
    else if (tier === 'active') { STATE.tracking[tiktok].ca = true; STATE.tracking[tiktok].cn = false; }
    else if (tier === 'vip') { STATE.tracking[tiktok].cv = true; STATE.tracking[tiktok].ca = false; }
    STATE.tracking[tiktok].dj = true;
    queueSave();
  }
  res.json({ ok: true });
});

app.post('/api/lookup', (req, res) => {
  const { type, value } = req.body;
  if (!STATE) return res.json({});
  if (type === 'discord') {
    const tt = (STATE.discMap || {})[value.toLowerCase()];
    if (!tt) return res.json({});
    const t = (STATE.tracking || {})[tt] || {};
    return res.json({ tiktok: tt, uname: t.uname, tier: t.tier, dj: t.dj, email: t.email || '' });
  }
  if (type === 'tiktok') {
    const t = (STATE.tracking || {})[value.toLowerCase()];
    if (!t) return res.json({});
    return res.json({ tiktok: value, uname: t.uname || '', tier: t.tier, dj: t.dj, email: t.email || '' });
  }
  res.json({});
});

app.post('/api/discord-join', (req, res) => { res.json({ ok: true }); });

// ── Startup ─────────────────────────────────────────────────────
loadState(() => {
  app.listen(PORT, () => {
    console.log('[Tracker] Running on port ' + PORT);
    console.log('[GH] Storage: ' + (GITHUB_TOKEN ? GITHUB_REPO : 'LOCAL ONLY'));
    const { spawn } = require('child_process');
    const botPath = path.join(__dirname, 'bot.js');
    if (fs.existsSync(botPath)) {
      spawn('node', [botPath], { stdio: 'inherit', env: { ...process.env, PORT: '10001' } });
      console.log('[Bot] Started');
    }
  });
});
