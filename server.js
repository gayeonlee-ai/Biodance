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

// Ensure local data dir exists as fallback
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const EMPTY_STATE = { tracking: {}, hist: {}, discMap: {}, agList: [], dcList: [] };

// ===== GITHUB API HELPERS =====
function githubRequest(method, apiPath, body, callback) {
  const data = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'api.github.com',
    path: apiPath,
    method: method,
    headers: {
      'Authorization': 'token ' + GITHUB_TOKEN,
      'User-Agent': 'biodance-tracker',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

  const req = https.request(options, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try { callback(null, JSON.parse(raw), res.statusCode); }
      catch(e) { callback(null, raw, res.statusCode); }
    });
  });
  req.on('error', callback);
  if (data) req.write(data);
  req.end();
}

function readFromGitHub(callback) {
  if (!GITHUB_TOKEN) return callback(null, EMPTY_STATE);
  githubRequest('GET', `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, null, (err, data, status) => {
    if (err || status === 404) return callback(null, EMPTY_STATE);
    try {
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      callback(null, JSON.parse(content), data.sha);
    } catch(e) { callback(null, EMPTY_STATE); }
  });
}

function writeToGitHub(state, callback) {
  if (!GITHUB_TOKEN) return callback(new Error('No token'));
  // First get current SHA
  githubRequest('GET', `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, null, (err, data, status) => {
    const sha = (status === 200 && data.sha) ? data.sha : undefined;
    const content = Buffer.from(JSON.stringify(state)).toString('base64');
    const body = {
      message: 'tracker: auto-save ' + new Date().toISOString(),
      content: content,
      ...(sha ? { sha } : {})
    };
    githubRequest('PUT', `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, body, (err2, res2, status2) => {
      if (err2) return callback(err2);
      if (status2 !== 200 && status2 !== 201) return callback(new Error('GitHub write failed: ' + status2));
      callback(null);
    });
  });
}

// ===== EXPRESS =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/tracker', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tracker.html')));

app.get('/api/state', (req, res) => {
  readFromGitHub((err, state) => {
    if (err) return res.json(EMPTY_STATE);
    res.json(state);
  });
});

app.post('/api/state', (req, res) => {
  readFromGitHub((err, cur, sha) => {
    const next = cur || {};
    if (req.body.tracking) next.tracking = req.body.tracking;
    if (req.body.discMap) next.discMap = req.body.discMap;
    if (req.body.agList) next.agList = req.body.agList;
    if (req.body.dcList) next.dcList = req.body.dcList;
    if (req.body.hist) Object.keys(req.body.hist).forEach(d => { next.hist = next.hist||{}; next.hist[d] = req.body.hist[d]; });
    next._lastSaved = new Date().toISOString();

    // Save locally too as backup
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(next));

    writeToGitHub(next, (err2) => {
      if (err2) {
        console.log('[GitHub] Write failed:', err2.message, '- using local only');
        return res.json({ ok: true, storage: 'local', dates: Object.keys(next.hist||{}).length });
      }
      console.log('[GitHub] Saved successfully');
      res.json({ ok: true, storage: 'github', dates: Object.keys(next.hist||{}).length });
    });
  });
});

app.post('/api/track', (req, res) => {
  const { handle, field, value } = req.body;
  readFromGitHub((err, cur) => {
    const next = cur || {};
    if (!next.tracking) next.tracking = {};
    if (!next.tracking[handle]) next.tracking[handle] = {};
    next.tracking[handle][field] = value;
    next._lastSaved = new Date().toISOString();
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(next));
    writeToGitHub(next, (err2) => {
      res.json({ ok: !err2, storage: err2 ? 'local' : 'github' });
    });
  });
});

app.post('/api/history', (req, res) => {
  const { date, snapshot } = req.body;
  readFromGitHub((err, cur) => {
    const next = cur || {};
    if (!next.hist) next.hist = {};
    next.hist[date] = snapshot;
    next._lastSaved = new Date().toISOString();
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(next));
    writeToGitHub(next, (err2) => {
      res.json({ ok: !err2, dates: Object.keys(next.hist).length });
    });
  });
});

app.listen(PORT, () => {
  console.log(`[Tracker] Running on port ${PORT}`);
  console.log(`[GitHub] Storage: ${GITHUB_TOKEN ? GITHUB_REPO : 'LOCAL ONLY (no token)'}`);

  const { spawn } = require('child_process');
  const botPath = path.join(__dirname, 'bot.js');
  if (fs.existsSync(botPath)) {
    const bot = spawn('node', [botPath], { stdio: 'inherit', env: { ...process.env, PORT: '10001' } });
    bot.on('exit', (code) => {
      if (code !== 0) setTimeout(() => spawn('node', [botPath], { stdio: 'inherit', env: { ...process.env, PORT: '10001' } }), 5000);
    });
    console.log('[Bot] Discord bot started');
  }
});

// ─── BOT API ENDPOINTS ───

// /approve: Discord username ↔ TikTok handle 매핑 저장
app.post('/api/approve', (req, res) => {
  const { username, tiktok, tier, discordId } = req.body;
  if (!username || !tiktok) return res.status(400).json({ ok: false, error: 'Missing fields' });

  readFromGitHub((err, cur) => {
    const next = cur || {};
    if (!next.tracking) next.tracking = {};
    if (!next.discMap) next.discMap = {};

    // Save username ↔ tiktok mapping
    next.discMap[username] = tiktok;

    // Update tracking for this creator
    if (!next.tracking[tiktok]) next.tracking[tiktok] = {};
    next.tracking[tiktok].dj = true;
    next.tracking[tiktok].uname = username;
    if (discordId) next.tracking[tiktok].discordId = discordId;

    // Set channel checkbox based on tier
    if (tier === 'new') next.tracking[tiktok].cn = true;
    else if (tier === 'active') next.tracking[tiktok].ca = true;
    else if (tier === 'vip' || tier === 'vvip') next.tracking[tiktok].cv = true;

    next._lastSaved = new Date().toISOString();
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(next));

    writeToGitHub(next, (err2) => {
      if (err2) {
        console.log('[API/approve] GitHub failed, local saved');
        return res.json({ ok: true, storage: 'local', tiktok, username });
      }
      console.log('[API/approve] Saved: ' + username + ' → @' + tiktok);
      res.json({ ok: true, storage: 'github', tiktok, username });
    });
  });
});

// /role-assign: 역할 부여 시 채널 체크박스 자동 업데이트
app.post('/api/role-assign', (req, res) => {
  const { username, nickname, tier, discordId } = req.body;

  readFromGitHub((err, cur) => {
    const next = cur || {};
    if (!next.tracking) next.tracking = {};
    if (!next.discMap) next.discMap = {};

    // Find TikTok handle via discMap or nickname
    let tiktok = next.discMap[username] || next.discMap[nickname] || nickname;

    if (tiktok && next.tracking[tiktok]) {
      // Update channel checkbox
      if (tier === 'new') next.tracking[tiktok].cn = true;
      else if (tier === 'active') { next.tracking[tiktok].ca = true; next.tracking[tiktok].cn = false; }
      else if (tier === 'vip') { next.tracking[tiktok].cv = true; next.tracking[tiktok].ca = false; }
      else if (tier === 'vvip') next.tracking[tiktok].cv = true;
      next.tracking[tiktok].dj = true;
      next._lastSaved = new Date().toISOString();
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(next));
      writeToGitHub(next, () => {});
      console.log('[API/role-assign] ' + tiktok + ' → ' + tier);
    }
    res.json({ ok: true });
  });
});

// /discord-join: 서버 입장 기록
app.post('/api/discord-join', (req, res) => {
  const { username, discordId } = req.body;
  // Just log for now - no TikTok handle yet
  console.log('[Discord Join] @' + username + ' (' + discordId + ') joined server');
  res.json({ ok: true });
});
