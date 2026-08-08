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
  { id: '1', title: 'Botox Alternative', creator: '@catawellness',
    url: 'https://www.tiktok.com/@catawellness/video/7669774284654529806',
    hook: '"I cancelled my Botox appointment."',
    points: ['Caviar Water → Glow + Firmness', 'Salmon PDRN → Fine lines + Skin texture', 'Panthenol = Repair, Squalane = Elasticity'],
    direction: 'Show your face close-up. Talk about skin losing quality. Pivot to the serum as the game changer.' },
  { id: '2', title: 'Product Review & Price Drop', creator: '@tucarritonaranja1',
    url: 'https://www.tiktok.com/@tucarritonaranja1/video/7667419819586718989',
    hook: '"If you have not bought this anti-aging serum yet — now is the time."',
    points: ['1000 ppm Salmon PDRN → Renew skin elasticity from within', '6 types of Hyaluronic Acid → Layered hydration', 'Niacinamide → Even skin tone'],
    direction: 'Urgency angle — price just dropped + free shipping. Position as an anti-aging powerhouse.' },
  { id: '3', title: 'PDRN Debunk', creator: '@estybestieshopfinds',
    url: 'https://www.tiktok.com/@estybestieshopfinds/video/7665196247736732959',
    hook: '"Turns out Salmon Sperm IS A LIE."',
    points: ['Liposomal technology protects DNA fragments for deeper absorption', 'Daily affordable ritual vs $1,200 PDRN facials', 'Sustained cellular repair, not a spike'],
    direction: 'Controversial hook → debunk cheap PDRN → introduce Biodance as the real deal. Compare to $1,200 facials.' },
  { id: '4', title: 'Anti-Aging Critique + Applicator', creator: '@allure_fashion',
    url: 'https://www.tiktok.com/@allure_fashion/video/7666553552461974798',
    hook: '"If you are doing anti-aging wrong, it can actually make you look older."',
    points: ['Syringe applicator targets specific spots', '67% Hyaluronic Water — highest concentration', 'Panthenol repairs, Squalane locks in moisture'],
    direction: 'Start with a bold claim about doing anti-aging wrong. Show the applicator. Emphasize the 67% concentration.' },
  { id: '5', title: 'Celebrity Treatment', creator: '@stephnicole923',
    url: 'https://www.tiktok.com/@stephnicole923/video/7665164039827328270',
    hook: '"This is the treatment celebrities get before big events."',
    points: ['Caviar + PDRN dual-action rejuvenation', 'Skin booster = improve skin quality, not change face shape', 'Works like professional injectable treatments'],
    direction: 'Celebrity angle → demo the product → "filter on your face" result. Emphasize it just launched.' },
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
  var vCards = TIPS_VIDEOS.map(v => {
    var watchUrl = '/watch/' + v.id + '?u=' + encodeURIComponent(user) + '&d=' + encodeURIComponent(discord);
    var pointsHtml = v.points.map(p => '<div class="sp">✦ ' + p + '</div>').join('');
    return '<div class="vc">' +
      '<div class="vh">' +
        '<div class="vn">' + v.id + '</div>' +
        '<div class="vi"><div class="vt">' + v.title + '</div><div class="vs">' + v.creator + '</div></div>' +
        '<a href="' + watchUrl + '" target="_blank" class="va">▶ Watch</a>' +
      '</div>' +
      '<div class="vb">' +
        '<div class="hook">🎣 Hook: <span>' + v.hook + '</span></div>' +
        '<div class="sps">' + pointsHtml + '</div>' +
        '<div class="dir">🎬 Direction: ' + v.direction + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="referrer" content="no-referrer">' +
  '<title>Biodance Creator Tips</title>' +
  '<style>' +
  'body{margin:0;background:#0e0f13;color:#e8eaf0;font-family:Segoe UI,sans-serif;padding:20px;max-width:720px;margin:0 auto}' +
  '.hdr{text-align:center;padding:30px 0 20px;border-bottom:1px solid #252830;margin-bottom:24px}' +
  '.hdr h1{font-size:24px;color:#fff;margin:0 0 6px}.hdr p{font-size:13px;color:#7b7e8e}' +
  '.badge{display:inline-block;font-size:11px;padding:3px 10px;border-radius:20px;margin-bottom:12px}' +
  '.b-new{background:rgba(0,180,216,.15);color:#00b4d8}.b-active{background:rgba(62,207,142,.15);color:#3ecf8e}.b-vip{background:rgba(245,197,66,.15);color:#f5c542}' +
  '.sec{background:#16181f;border:1px solid #252830;border-radius:12px;padding:20px;margin-bottom:16px}' +
  '.sec h2{font-size:16px;color:#fff;margin:0 0 14px}' +
  '.vc{background:#16181f;border:1px solid #252830;border-radius:12px;margin-bottom:14px;overflow:hidden}' +
  '.vh{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#1a1d27;border-bottom:1px solid #252830}' +
  '.vn{width:34px;height:34px;background:#7c6af7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#fff;flex-shrink:0}' +
  '.vi{flex:1}.vt{font-weight:700;font-size:15px;color:#fff}.vs{font-size:11px;color:#7b7e8e;margin-top:2px}' +
  '.va{font-size:12px;color:#fff;font-weight:600;background:#7c6af7;padding:6px 14px;border-radius:6px;text-decoration:none;white-space:nowrap}' +
  '.va:hover{background:#6b5ce0}' +
  '.vb{padding:14px 16px}' +
  '.hook{font-size:13px;color:#e8eaf0;margin-bottom:10px;padding:8px 12px;background:rgba(124,106,247,.08);border-left:3px solid #7c6af7;border-radius:0 6px 6px 0}' +
  '.hook span{font-weight:700;color:#fff;font-style:italic}' +
  '.sps{margin-bottom:10px}' +
  '.sp{font-size:12px;color:#b0b3c6;padding:3px 0;display:flex;gap:6px}' +
  '.dir{font-size:12px;color:#7b7e8e;padding:8px 12px;background:#1a1d27;border-radius:6px;line-height:1.6}' +
  '.ft{text-align:center;padding:20px 0;font-size:11px;color:#3a3d4a}' +
  '.tip{background:#1a1d27;border-left:3px solid #3ecf8e;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:8px;font-size:13px}' +
  '.tip b{color:#3ecf8e}' +
  '</style></head><body>' +
  '<div class="hdr">' +
  '<div class="badge b-' + channel + '">' + channel.toUpperCase() + ' CHANNEL</div>' +
  '<h1>🔥 Top GMV Video Breakdown</h1>' +
  '<p>Caviar PDRN Serum — Watch the video, study the hook, remix it for your content</p></div>' +

  '<div class="sec"><h2>📺 Top 5 Videos + Hooks & Scripts</h2>' +
  '<p style="font-size:12px;color:#7b7e8e;margin-bottom:14px">Click ▶ Watch to see the actual video, then use the hook and direction for your own version!</p>' +
  vCards + '</div>' +

  '<div class="sec"><h2>💡 Quick Filming Tips</h2>' +
  '<div class="tip"><b>Volume wins:</b> Post at least 5+ videos — TikTok needs data to find your winning hook</div>' +
  '<div class="tip"><b>Car filming:</b> Casual, authentic vibe that converts well right now</div>' +
  '<div class="tip"><b>B&A close-ups:</b> Start with a close-up of your skin concern — wrinkles, texture, fine lines</div>' +
  '<div class="tip"><b>Price anchor:</b> Compare to $1,200+ clinic treatments — makes $35 serum feel like a steal</div>' +
  '<div class="tip"><b>End with CTA:</b> "Link above my name" / "Check the link below before it\'s gone"</div>' +
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
