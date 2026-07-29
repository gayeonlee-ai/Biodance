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

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const EMPTY = { tracking: {}, hist: {}, discMap: {}, agList: [], dcList: [] };

// ── GitHub helpers ──────────────────────────────────────────────
function ghGet(cb) {
  if (!GITHUB_TOKEN) return cb(null, EMPTY, null);
  const opts = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    method: 'GET',
    headers: { 'Authorization': 'token ' + GITHUB_TOKEN, 'User-Agent': 'biodance-tracker', 'Accept': 'application/vnd.github.v3+json' }
  };
  const req = https.request(opts, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const j = JSON.parse(raw);
        if (res.statusCode === 404 || !j.content) return cb(null, EMPTY, null);
        const data = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
        cb(null, data, j.sha);
      } catch(e) { cb(null, EMPTY, null); }
    });
  });
  req.on('error', () => cb(null, EMPTY, null));
  req.end();
}

function ghPut(data, sha, cb) {
  if (!GITHUB_TOKEN) return cb(new Error('no token'));
  const content = Buffer.from(JSON.stringify(data)).toString('base64');
  const body = JSON.stringify({ message: 'tracker: save ' + new Date().toISOString(), content, ...(sha ? { sha } : {}) });
  const opts = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    method: 'PUT',
    headers: { 'Authorization': 'token ' + GITHUB_TOKEN, 'User-Agent': 'biodance-tracker', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  const req = https.request(opts, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) return cb(null);
      cb(new Error('gh_' + res.statusCode + ': ' + raw.slice(0, 80)));
    });
  });
  req.on('error', cb);
  req.write(body);
  req.end();
}

// Save with retry (handles 409 conflict by re-fetching SHA)
function ghSave(data, retries, cb) {
  data._lastSaved = new Date().toISOString();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data)); // always save locally first
  if (!GITHUB_TOKEN) return cb(null, 'local');
  ghGet((err, _cur, sha) => {
    ghPut(data, sha, (err2) => {
      if (!err2) return cb(null, 'github');
      if (retries > 0 && err2.message && err2.message.includes('gh_409')) {
        console.log('[GitHub] 409 conflict, retrying...');
        setTimeout(() => ghSave(data, retries - 1, cb), 1000);
      } else {
        console.log('[GitHub] Save failed:', err2.message, '- using local');
        cb(null, 'local');
      }
    });
  });
}

// ── Merge helper ────────────────────────────────────────────────
function merge(cur, body) {
  const next = Object.assign({}, cur);
  if (body.tracking) next.tracking = body.tracking;
  if (body.discMap) next.discMap = body.discMap;
  if (body.agList) next.agList = body.agList;
  if (body.dcList) next.dcList = body.dcList;
  if (body.hist) {
    if (!next.hist) next.hist = {};
    Object.keys(body.hist).forEach(d => { next.hist[d] = body.hist[d]; });
  }
  return next;
}

// ── Express ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/tracker', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

app.get('/api/state', (req, res) => {
  ghGet((err, data) => res.json(data || EMPTY));
});

app.post('/api/state', (req, res) => {
  ghGet((err, cur, sha) => {
    const next = merge(cur || EMPTY, req.body);
    ghSave(next, 3, (err2, storage) => {
      res.json({ ok: true, storage, dates: Object.keys(next.hist || {}).length });
    });
  });
});

app.post('/api/track', (req, res) => {
  const { handle, field, value } = req.body;
  ghGet((err, cur) => {
    const next = cur || EMPTY;
    if (!next.tracking) next.tracking = {};
    if (!next.tracking[handle]) next.tracking[handle] = {};
    next.tracking[handle][field] = value;
    ghSave(next, 3, (err2, storage) => res.json({ ok: true, storage }));
  });
});

app.post('/api/history', (req, res) => {
  const { date, snapshot } = req.body;
  ghGet((err, cur) => {
    const next = cur || EMPTY;
    if (!next.hist) next.hist = {};
    next.hist[date] = snapshot;
    ghSave(next, 3, (err2, storage) => res.json({ ok: true, dates: Object.keys(next.hist).length }));
  });
});

// Bot API endpoints
app.post('/api/approve', (req, res) => {
  const { username, tiktok, tier, discordId } = req.body;
  if (!username || !tiktok) return res.status(400).json({ ok: false });
  ghGet((err, cur) => {
    const next = cur || EMPTY;
    if (!next.discMap) next.discMap = {};
    if (!next.tracking) next.tracking = {};
    next.discMap[username] = tiktok;
    if (!next.tracking[tiktok]) next.tracking[tiktok] = {};
    next.tracking[tiktok].dj = true;
    next.tracking[tiktok].uname = username;
    if (discordId) next.tracking[tiktok].discordId = discordId;
    if (tier === 'new') next.tracking[tiktok].cn = true;
    else if (tier === 'active') next.tracking[tiktok].ca = true;
    else if (tier === 'vip' || tier === 'vvip') next.tracking[tiktok].cv = true;
    ghSave(next, 3, (err2, storage) => {
      console.log('[API/approve] ' + username + ' → @' + tiktok);
      res.json({ ok: true, storage, tiktok, username });
    });
  });
});

app.post('/api/role-assign', (req, res) => {
  const { username, nickname, tier } = req.body;
  ghGet((err, cur) => {
    const next = cur || EMPTY;
    const tiktok = (next.discMap || {})[username] || (next.discMap || {})[nickname] || nickname;
    if (tiktok && next.tracking && next.tracking[tiktok]) {
      if (tier === 'new') next.tracking[tiktok].cn = true;
      else if (tier === 'active') { next.tracking[tiktok].ca = true; next.tracking[tiktok].cn = false; }
      else if (tier === 'vip') { next.tracking[tiktok].cv = true; next.tracking[tiktok].ca = false; }
      else if (tier === 'vvip') next.tracking[tiktok].cv = true;
      next.tracking[tiktok].dj = true;
      ghSave(next, 2, () => {});
    }
    res.json({ ok: true });
  });
});

app.post('/api/lookup', (req, res) => {
  const { type, value } = req.body;
  ghGet((err, cur) => {
    if (!cur) return res.json({});
    const tracking = cur.tracking || {};
    const discMap = cur.discMap || {};
    if (type === 'discord') {
      const tiktok = discMap[value.toLowerCase()];
      if (!tiktok) return res.json({});
      const t = tracking[tiktok] || {};
      return res.json({ tiktok, uname: t.uname, tier: t.tier, dj: t.dj, email: t.email || '' });
    }
    if (type === 'tiktok') {
      const t = tracking[value.toLowerCase()];
      if (!t) return res.json({});
      return res.json({ tiktok: value, uname: t.uname || '', tier: t.tier, dj: t.dj, email: t.email || '' });
    }
    res.json({});
  });
});

app.post('/api/discord-join', (req, res) => {
  console.log('[Discord Join] @' + req.body.username);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[Tracker] Running on port ${PORT}`);
  console.log(`[GitHub] Storage: ${GITHUB_TOKEN ? GITHUB_REPO : 'LOCAL ONLY'}`);
  const { spawn } = require('child_process');
  const botPath = path.join(__dirname, 'bot.js');
  if (fs.existsSync(botPath)) {
    const bot = spawn('node', [botPath], { stdio: 'inherit', env: { ...process.env, PORT: '10001' } });
    bot.on('exit', code => {
      if (code !== 0) setTimeout(() => spawn('node', [botPath], { stdio: 'inherit', env: { ...process.env, PORT: '10001' } }), 5000);
    });
    console.log('[Bot] Discord bot started');
  }
});
