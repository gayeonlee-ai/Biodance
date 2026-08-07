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
const TIPS_URL = process.env.TIPS_URL || '';

const TIPS_VIDEOS = [
  { id: '1', title: 'Botox alternative', creator: '@catawellness', url: 'https://www.tiktok.com/@catawellness/video/7669774284654529806' },
  { id: '2', title: 'Product review', creator: '@tucarritonaranja1', url: 'https://www.tiktok.com/@tucarritonaranja1/video/7667419819586718989' },
  { id: '3', title: 'PDRN debunk', creator: '@estybestieshopfinds', url: 'https://www.tiktok.com/@estybestieshopfinds/video/7665196247736732959' },
  { id: '4', title: 'Anti-aging critique', creator: '@allure_fashion', url: 'https://www.tiktok.com/@allure_fashion/video/7666553552461974798' },
  { id: '5', title: 'Celebrity treatment', creator: '@stephnicole923', url: 'https://www.tiktok.com/@stephnicole923/video/7665164039827328270' },
];

// POST /api/tips-click — bot calls this when button is clicked
app.post('/api/tips-click', (req, res) => {
  if (!STATE) STATE = EMPTY;
  if (!STATE.tipsLog) STATE.tipsLog = { views: [], clicks: [] };
  if (Array.isArray(STATE.tipsLog)) STATE.tipsLog = { views: STATE.tipsLog, clicks: [] };
  STATE.tipsLog.views.push({
    user: req.body.user || 'anonymous',
    discord: req.body.discord || '',
    channel: req.body.channel || 'unknown',
    time: new Date().toISOString()
  });
  queueSave();
  res.json({ ok: true });
});

// GET /tips-page/:channel — custom tips page
app.get('/tips-page/:channel', (req, res) => {
  const ch = req.params.channel || 'new';
  const u = req.query.u || 'anonymous';
  const d = req.query.d || '';
  const html = buildTipsPage(ch, u, d);
  res.set('Content-Type', 'text/html');
  res.send(html);
});

// GET /watch/:id — video click tracking + redirect
app.get('/watch/:id', (req, res) => {
  const vid = req.params.id;
  const u = req.query.u || 'anonymous';
  const d = req.query.d || '';
  if (!STATE) STATE = EMPTY;
  if (!STATE.tipsLog) STATE.tipsLog = { views: [], clicks: [] };
  if (Array.isArray(STATE.tipsLog)) STATE.tipsLog = { views: STATE.tipsLog, clicks: [] };
  STATE.tipsLog.clicks.push({
    user: u, discord: d, videoId: vid, time: new Date().toISOString()
  });
  queueSave();
  const video = TIPS_VIDEOS.find(v => v.id === vid);
  res.redirect(video ? video.url : '/tracker');
});

// GET /api/tips-log — return all tracking data
app.get('/api/tips-log', (req, res) => {
  if (!STATE || !STATE.tipsLog) return res.json({ views: [], clicks: [], videos: TIPS_VIDEOS });
  const log = Array.isArray(STATE.tipsLog) ? { views: STATE.tipsLog, clicks: [] } : STATE.tipsLog;
  res.json({ views: log.views || [], clicks: log.clicks || [], videos: TIPS_VIDEOS });
});

// GET /tips/:channel — simple redirect (backward compat)
app.get('/tips/:channel', (req, res) => {
  const ch = req.params.channel || 'new';
  if (!STATE) STATE = EMPTY;
  if (!STATE.tipsLog) STATE.tipsLog = { views: [], clicks: [] };
  if (Array.isArray(STATE.tipsLog)) STATE.tipsLog = { views: STATE.tipsLog, clicks: [] };
  STATE.tipsLog.views.push({
    user: 'anonymous', discord: '', channel: ch, time: new Date().toISOString()
  });
  queueSave();
  res.redirect(TIPS_URL || '/tracker');
});

function buildTipsPage(channel, user, discord) {
  const vLinks = TIPS_VIDEOS.map(v =>
    '<a href="/watch/' + v.id + '?u=' + encodeURIComponent(user) + '&d=' + encodeURIComponent(discord) + '" target="_blank" class="vc">' +
    '<div class="vn">' + v.id + '</div>' +
    '<div class="vi"><div class="vt">' + v.title + '</div><div class="vs">' + v.creator + '</div></div>' +
    '<div class="va">Watch ↗</div></a>'
  ).join('');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Biodance Creator Tips</title>' +
  '<style>' +
  'body{margin:0;background:#0e0f13;color:#e8eaf0;font-family:Segoe UI,sans-serif;padding:20px;max-width:680px;margin:0 auto}' +
  '.hdr{text-align:center;padding:30px 0 20px;border-bottom:1px solid #252830;margin-bottom:24px}' +
  '.hdr h1{font-size:24px;color:#fff;margin:0 0 6px}.hdr p{font-size:13px;color:#7b7e8e}' +
  '.badge{display:inline-block;font-size:11px;padding:3px 10px;border-radius:20px;margin-bottom:12px}' +
  '.b-new{background:rgba(0,180,216,.15);color:#00b4d8}.b-active{background:rgba(62,207,142,.15);color:#3ecf8e}.b-vip{background:rgba(245,197,66,.15);color:#f5c542}' +
  '.sec{background:#16181f;border:1px solid #252830;border-radius:12px;padding:20px;margin-bottom:16px}' +
  '.sec h2{font-size:16px;color:#fff;margin:0 0 14px}' +
  '.vc{display:flex;align-items:center;gap:12px;padding:12px;background:#1a1d27;border-radius:8px;margin-bottom:8px;text-decoration:none;color:#e8eaf0;border:1px solid #252830;transition:.2s}' +
  '.vc:hover{border-color:#7c6af7;background:#1e2030}' +
  '.vn{width:32px;height:32px;background:#7c6af7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;flex-shrink:0}' +
  '.vi{flex:1}.vt{font-weight:600;font-size:14px;color:#fff}.vs{font-size:11px;color:#7b7e8e;margin-top:2px}' +
  '.va{font-size:12px;color:#7c6af7;font-weight:600;white-space:nowrap}' +
  '.tip{background:#1a1d27;border-left:3px solid #3ecf8e;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:8px;font-size:13px}' +
  '.tip b{color:#3ecf8e}' +
  '.ft{text-align:center;padding:20px 0;font-size:11px;color:#3a3d4a}' +
  '</style></head><body>' +
  '<div class="hdr">' +
  '<div class="badge b-' + channel + '">' + channel.toUpperCase() + ' CHANNEL</div>' +
  '<h1>🔥 Top GMV Video Breakdown</h1>' +
  '<p>Caviar PDRN Serum — Proven hooks, selling points & scripts</p></div>' +

  '<div class="sec"><h2>📺 Top performing videos</h2>' +
  '<p style="font-size:12px;color:#7b7e8e;margin-bottom:14px">Click any video to watch and study the format</p>' +
  vLinks + '</div>' +

  '<div class="sec"><h2>🎯 Filming tips that work right now</h2>' +
  '<div class="tip"><b>Hook 1 — Syringe applicator:</b> Show the applicator targeting frown lines or smile lines. "I cancelled my Botox appointment because of this."</div>' +
  '<div class="tip"><b>Hook 2 — Talk in the car:</b> Casual vibe. "Standard PDRN just doesn\'t work — you need Liposomal PDRN combined with Caviar."</div>' +
  '<div class="tip"><b>Hook 3 — Booking screen:</b> Show a clinic booking. "I have a limited budget for wrinkles — so I found this instead."</div>' +
  '<div class="tip"><b>Hook 4 — B&A close-up:</b> Start with a close-up of your skin. "My forehead looks like this, my neck looks like this..."</div>' +
  '<div class="tip"><b>Hook 5 — Price shock:</b> "Skin booster treatments cost $1,200+ — but this serum uses the same ingredients."</div>' +
  '</div>' +

  '<div class="sec"><h2>🔑 Key selling points to mention</h2>' +
  '<div class="tip"><b>1000 ppm Salmon PDRN</b> — Renew and improve skin elasticity from within</div>' +
  '<div class="tip"><b>Liposomal technology</b> — Protects DNA fragments for deeper absorption</div>' +
  '<div class="tip"><b>67% Hyaluronic Water</b> — Highest concentration, best form</div>' +
  '<div class="tip"><b>Caviar + PDRN dual-action</b> — Surface glow + deep repair</div>' +
  '<div class="tip"><b>Syringe applicator</b> — Targets specific spots like frown lines</div>' +
  '</div>' +

  '<div class="ft">Biodance Creator Tips • Pick your angle, film today, post it! 🚀</div>' +
  '</body></html>';
}

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
