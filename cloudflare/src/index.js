const MARKETS = Object.freeze({ '2D': { digits: 2, multiplier: 80, utc: '11:30' }, '3D': { digits: 3, multiplier: 650, utc: '12:30' }, '4D': { digits: 4, multiplier: 6000, utc: '13:30' } });
const enc = new TextEncoder();
const MAX_STAKE = 100000;
const MAX_POINTS = 1000000000;

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new ApiError(status, message); };
const nowIso = () => new Date().toISOString();
const nowSec = () => Math.floor(Date.now() / 1000);
const localDay = (ms = Date.now()) => new Date(ms + 6.5 * 3600000).toISOString().slice(0, 10);
const cutoffIso = (day, market) => `${day}T${MARKETS[market].utc}:00.000Z`;
const validUser = x => typeof x === 'string' && /^[A-Za-z0-9_.-]{3,32}$/.test(x);
const validKey = x => typeof x === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(x);
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;

function bytesToB64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}
function b64urlToBytes(s) {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - s.length % 4) % 4);
  const raw = atob(b64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function sha256(text) {
  return bytesToB64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))));
}
function randomToken() {
  const b = new Uint8Array(32); crypto.getRandomValues(b); return bytesToB64url(b);
}
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) fail(400, 'Password ကို ၁၂–၁၂၈ လုံး သတ်မှတ်ပါ။');
  const salt = new Uint8Array(16); crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const rounds = 120000;
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256);
  return `pbkdf2$${rounds}$${bytesToB64url(salt)}$${bytesToB64url(new Uint8Array(bits))}`;
}
async function verifyPassword(password, saved) {
  try {
    const [kind, roundsText, saltText, digestText] = String(saved).split('$');
    if (kind !== 'pbkdf2') return false;
    const rounds = Number(roundsText);
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64urlToBytes(saltText), iterations: rounds }, key, 256));
    const expected = b64urlToBytes(digestText);
    if (bits.length !== expected.length) return false;
    let diff = 0; for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch { return false; }
}

function corsHeaders(env, req) {
  const allowed = env.APP_ORIGIN || 'https://app.local';
  const origin = req.headers.get('Origin');
  const h = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  if (origin === allowed) {
    h.set('Access-Control-Allow-Origin', allowed);
    h.set('Vary', 'Origin');
    h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Demo-Admin-Key');
    h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  return h;
}
function json(env, req, body, status = 200, extra = {}) {
  const h = corsHeaders(env, req);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(JSON.stringify(body), { status, headers: h });
}
async function body(req) {
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/json') fail(415, 'JSON လိုအပ်ပါသည်။');
  const text = await req.text();
  if (!text || text.length > 20000) fail(413, 'Request size မမှန်ပါ။');
  try { const x = JSON.parse(text); if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(); return x; }
  catch { fail(400, 'Request data မမှန်ပါ။'); }
}
function bearer(req) {
  const a = req.headers.get('Authorization') || '';
  return a.startsWith('Bearer ') ? a.slice(7).trim() : '';
}
async function auth(env, req) {
  const raw = bearer(req); if (!raw) fail(401, 'ပြန်လည် အကောင့်ဝင်ပါ။');
  const digest = await sha256(raw);
  const u = await env.DB.prepare(`SELECT u.id,u.username,u.points,u.daily_limit,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.digest=? AND s.expires>? AND u.active=1 AND u.role='player'`).bind(digest, nowSec()).first();
  if (!u) fail(401, 'ပြန်လည် အကောင့်ဝင်ပါ။');
  return { ...u, tokenDigest: digest };
}
function adminAuth(env, req) {
  const got = req.headers.get('X-Demo-Admin-Key') || '';
  if (!env.ADMIN_TOKEN || got !== env.ADMIN_TOKEN) fail(401, 'Admin key မမှန်ပါ။');
}
async function configObject(env) {
  const { results } = await env.DB.prepare('SELECT key,value FROM app_config').all();
  return Object.fromEntries(results.map(r => [r.key, r.value]));
}
async function rateLogin(env, key) {
  const t = nowSec();
  const row = await env.DB.prepare('SELECT count,started FROM login_rate WHERE key=?').bind(key).first();
  if (row && t - Number(row.started) < 900 && Number(row.count) >= 15) fail(429, 'ကြိုးစားမှုများနေပါသည်။ ၁၅ မိနစ်အကြာ ပြန်စမ်းပါ။');
  await env.DB.prepare(`INSERT INTO login_rate(key,count,started) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN ?-login_rate.started>=900 THEN 1 ELSE login_rate.count+1 END,started=CASE WHEN ?-login_rate.started>=900 THEN ? ELSE login_rate.started END`).bind(key, t, t, t, t).run();
}

async function publishDue(env) {
  const due = (await env.DB.prepare('SELECT day,market,result,publish_at FROM scheduled_results WHERE publish_at<=? ORDER BY publish_at LIMIT 12').bind(nowIso()).all()).results;
  for (const r of due) {
    const note = `${r.market} ${r.result} demo result reward`;
    const ts = nowIso();
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO results(day,market,result,published_at) VALUES(?,?,?,?)').bind(r.day, r.market, r.result, ts),
      env.DB.prepare(`UPDATE users SET points=points+COALESCE((SELECT SUM(p.stake*p.multiplier) FROM plays p WHERE p.user_id=users.id AND p.day=? AND p.market=? AND p.number=? AND p.reward=0),0) WHERE EXISTS(SELECT 1 FROM plays p WHERE p.user_id=users.id AND p.day=? AND p.market=? AND p.number=? AND p.reward=0)`).bind(r.day, r.market, r.result, r.day, r.market, r.result),
      env.DB.prepare(`INSERT OR IGNORE INTO point_ledger(user_id,delta,balance_after,kind,ref,note,created_at) SELECT p.user_id,p.stake*p.multiplier,u.points,'win','win:'||p.id,?,? FROM plays p JOIN users u ON u.id=p.user_id WHERE p.day=? AND p.market=? AND p.number=? AND p.reward=0`).bind(note, ts, r.day, r.market, r.result),
      env.DB.prepare('UPDATE plays SET reward=stake*multiplier WHERE day=? AND market=? AND number=? AND reward=0').bind(r.day, r.market, r.result),
      env.DB.prepare('DELETE FROM scheduled_results WHERE day=? AND market=?').bind(r.day, r.market)
    ]);
  }
}

async function publicState(env) {
  await publishDue(env);
  const cfg = await configObject(env);
  const results = (await env.DB.prepare('SELECT day,market,result,published_at FROM results ORDER BY day DESC,market LIMIT 90').all()).results;
  return {
    mode: 'free-play',
    currency: 'DEMO_POINTS',
    redeemable: false,
    server_time: nowIso(),
    day: localDay(),
    announcement: cfg.announcement || '',
    maintenance: cfg.maintenance === '1',
    min_app_version: Number(cfg.min_app_version || 1),
    draw_times: { '2D': '18:00', '3D': '19:00', '4D': '20:00' },
    multipliers: Object.fromEntries(Object.entries(MARKETS).map(([k, v]) => [k, v.multiplier])),
    results
  };
}
async function playerState(env, req) {
  await publishDue(env);
  const u = await auth(env, req);
  const plays = (await env.DB.prepare('SELECT id,day,market,number,stake,multiplier,reward,created_at FROM plays WHERE user_id=? ORDER BY id DESC LIMIT 100').bind(u.id).all()).results;
  const ledger = (await env.DB.prepare('SELECT id,delta,balance_after,kind,note,created_at FROM point_ledger WHERE user_id=? ORDER BY id DESC LIMIT 100').bind(u.id).all()).results;
  const pub = await publicState(env);
  return { ...pub, account: { id: u.id, username: u.username, points: Number(u.points), daily_limit: Number(u.daily_limit) }, plays, ledger };
}
async function login(env, data) {
  const username = String(data.username || '').trim().toLowerCase();
  const password = data.password;
  await rateLogin(env, `login:${username}`);
  const u = await env.DB.prepare("SELECT id,username,password_hash,active FROM users WHERE username=? COLLATE NOCASE AND role='player'").bind(username).first();
  if (!u || !u.active || !(await verifyPassword(password, u.password_hash))) fail(401, 'Username သို့မဟုတ် Password မမှန်ပါ။');
  await env.DB.prepare('DELETE FROM login_rate WHERE key=?').bind(`login:${username}`).run();
  const t = nowSec(), ttl = Math.max(900, Number(env.SESSION_TTL_SECONDS || 43200));
  await env.DB.prepare('DELETE FROM sessions WHERE expires<=?').bind(t).run();
  const existing = (await env.DB.prepare('SELECT digest FROM sessions WHERE user_id=? ORDER BY created_at ASC').bind(u.id).all()).results;
  if (existing.length >= 2) await env.DB.prepare('DELETE FROM sessions WHERE digest=?').bind(existing[0].digest).run();
  const raw = randomToken(), digest = await sha256(raw);
  await env.DB.prepare('INSERT INTO sessions(digest,user_id,expires) VALUES(?,?,?)').bind(digest, u.id, t + ttl).run();
  return { token: raw, expires_in: ttl, max_devices: 2 };
}
async function play(env, req, data) {
  const u = await auth(env, req);
  const cfg = await configObject(env); if (cfg.maintenance === '1') fail(503, 'စနစ်ပြုပြင်နေပါသည်။');
  const market = String(data.market || ''), number = String(data.number || ''), stake = Number(data.stake), requestKey = data.request_key;
  if (!MARKETS[market] || !new RegExp(`^[0-9]{${MARKETS[market].digits}}$`).test(number) || !isInt(stake, 1, MAX_STAKE) || !validKey(requestKey)) fail(400, 'Demo play အချက်အလက် မမှန်ပါ။');
  const day = localDay();
  if (Date.now() >= Date.parse(cutoffIso(day, market))) fail(409, `${market} demo round ပိတ်ပြီးပါပြီ။`);
  const old = await env.DB.prepare('SELECT id,market,number,stake FROM plays WHERE user_id=? AND request_key=?').bind(u.id, requestKey).first();
  if (old) {
    if (old.market !== market || old.number !== number || Number(old.stake) !== stake) fail(409, 'Request key ကို မတူသော data နဲ့ သုံးပြီးသားပါ။');
    return { play_id: old.id, duplicate: true };
  }
  const ts = nowIso(), mult = MARKETS[market].multiplier;
  const batch = await env.DB.batch([
    env.DB.prepare(`INSERT INTO plays(user_id,day,market,number,stake,multiplier,request_key,created_at) SELECT u.id,?,?,?,?,?,?,? FROM users u WHERE u.id=? AND u.active=1 AND u.points>=? AND COALESCE((SELECT SUM(stake) FROM plays WHERE user_id=u.id AND day=?),0)+?<=u.daily_limit`).bind(day, market, number, stake, mult, requestKey, ts, u.id, stake, day, stake),
    env.DB.prepare(`UPDATE users SET points=points-? WHERE id=? AND EXISTS(SELECT 1 FROM plays WHERE user_id=? AND request_key=? AND charged=0)`).bind(stake, u.id, u.id, requestKey),
    env.DB.prepare('UPDATE plays SET charged=1 WHERE user_id=? AND request_key=? AND charged=0').bind(u.id, requestKey),
    env.DB.prepare(`INSERT OR IGNORE INTO point_ledger(user_id,delta,balance_after,kind,ref,note,created_at) SELECT p.user_id,-p.stake,u.points,'play','play:'||p.id,p.market||' '||p.number,? FROM plays p JOIN users u ON u.id=p.user_id WHERE p.user_id=? AND p.request_key=? AND p.charged=1`).bind(ts, u.id, requestKey)
  ]);
  if (Number(batch[0]?.meta?.changes || 0) < 1) {
    const again = await env.DB.prepare('SELECT id FROM plays WHERE user_id=? AND request_key=?').bind(u.id, requestKey).first();
    if (again) return { play_id: again.id, duplicate: true };
    fail(409, 'Demo Points မလုံလောက်ပါ သို့မဟုတ် နေ့စဉ် limit ကျော်ပါသည်။');
  }
  const made = await env.DB.prepare('SELECT id FROM plays WHERE user_id=? AND request_key=?').bind(u.id, requestKey).first();
  return { play_id: made.id, duplicate: false };
}
async function updatePreferences(env, req, data) {
  const u = await auth(env, req), daily = Number(data.daily_limit);
  if (!isInt(daily, 1, 1000000) || daily > Number(u.daily_limit)) fail(400, 'Daily limit ကို လျှော့ချနိုင်တာပဲ ဖြစ်ပါတယ်။');
  await env.DB.prepare('UPDATE users SET daily_limit=? WHERE id=?').bind(daily, u.id).run();
  return { ok: true };
}

async function adminCreateUser(env, data) {
  const username = String(data.username || '').trim().toLowerCase(), password = data.password;
  if (!validUser(username)) fail(400, 'Username သတ်မှတ်ချက် မမှန်ပါ။');
  const points = isInt(Number(data.starting_points), 0, 1000000) ? Number(data.starting_points) : Number(env.DEFAULT_STARTING_POINTS || 10000);
  const hash = await hashPassword(password);
  try {
    const r = await env.DB.prepare("INSERT INTO users(username,password_hash,role,points) VALUES(?,?,'player',?) RETURNING id,username,points").bind(username, hash, points).first();
    return r;
  } catch (e) { if (String(e?.message || '').includes('UNIQUE')) fail(409, 'Username ရှိပြီးသားပါ။'); throw e; }
}
async function adminGrant(env, data) {
  const userId = Number(data.user_id), delta = Number(data.delta), note = String(data.note || 'Demo point adjustment').slice(0, 120), key = data.request_key;
  if (!isInt(userId, 1, 2147483647) || !isInt(delta, -1000000, 1000000) || delta === 0 || !validKey(key)) fail(400, 'Point adjustment မမှန်ပါ။');
  const ref = `admin:${key}`;
  const old = await env.DB.prepare('SELECT id FROM point_ledger WHERE ref=?').bind(ref).first(); if (old) return { duplicate: true };
  const u = await env.DB.prepare("SELECT points FROM users WHERE id=? AND role='player'").bind(userId).first(); if (!u) fail(404, 'Player မတွေ့ပါ။');
  const next = Number(u.points) + delta; if (next < 0 || next > MAX_POINTS) fail(409, 'Demo Points limit မမှန်ပါ။');
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET points=? WHERE id=?').bind(next, userId),
    env.DB.prepare('INSERT INTO point_ledger(user_id,delta,balance_after,kind,ref,note) VALUES(?,?,?,?,?,?)').bind(userId, delta, next, 'admin', ref, note)
  ]);
  return { duplicate: false, points: next };
}
async function adminScheduleResult(env, data) {
  const day = String(data.day || localDay()), market = String(data.market || ''), result = String(data.result || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !MARKETS[market] || !new RegExp(`^[0-9]{${MARKETS[market].digits}}$`).test(result)) fail(400, 'Result မမှန်ပါ။');
  const existing = await env.DB.prepare('SELECT result FROM results WHERE day=? AND market=?').bind(day, market).first();
  if (existing) { if (existing.result === result) return { duplicate: true, published: true }; fail(409, 'Published demo result ကို ပြန်မပြင်နိုင်ပါ။'); }
  const scheduled = await env.DB.prepare('SELECT result FROM scheduled_results WHERE day=? AND market=?').bind(day, market).first();
  if (scheduled) { if (scheduled.result === result) return { duplicate: true, publish_at: cutoffIso(day, market) }; fail(409, 'Scheduled result ကို ပြန်မပြင်နိုင်ပါ။'); }
  const publishAt = cutoffIso(day, market);
  await env.DB.prepare('INSERT INTO scheduled_results(day,market,result,publish_at) VALUES(?,?,?,?)').bind(day, market, result, publishAt).run();
  await publishDue(env);
  return { ok: true, publish_at: publishAt };
}
async function adminConfig(env, data) {
  const allowed = new Set(['announcement', 'maintenance', 'min_app_version']);
  const entries = Object.entries(data).filter(([k]) => allowed.has(k)); if (!entries.length) fail(400, 'Config မရှိပါ။');
  const stmts = entries.map(([k, v]) => env.DB.prepare(`INSERT INTO app_config(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(k, String(v), nowIso()));
  await env.DB.batch(stmts); return { ok: true };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env, req) });
    try {
      if (req.method === 'GET' && path === '/health') return json(env, req, { ok: true, service: 'dubai-lottery-freeplay', mode: 'free-play' });
      if (req.method === 'GET' && (path === '/api/config' || path === '/api/results')) return json(env, req, await publicState(env), 200, { 'Cache-Control': 'public, max-age=30' });
      if (req.method === 'GET' && path === '/api/state') return json(env, req, await playerState(env, req));
      if (req.method === 'POST' && path === '/api/login') return json(env, req, await login(env, await body(req)));
      if (req.method === 'POST' && path === '/api/logout') {
        const u = await auth(env, req); await env.DB.prepare('DELETE FROM sessions WHERE digest=?').bind(u.tokenDigest).run(); return json(env, req, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/play') return json(env, req, await play(env, req, await body(req)));
      if (req.method === 'POST' && path === '/api/preferences') return json(env, req, await updatePreferences(env, req, await body(req)));
      if (path.startsWith('/admin/')) {
        adminAuth(env, req); const data = req.method === 'POST' ? await body(req) : {};
        if (req.method === 'POST' && path === '/admin/users') return json(env, req, await adminCreateUser(env, data));
        if (req.method === 'POST' && path === '/admin/grant') return json(env, req, await adminGrant(env, data));
        if (req.method === 'POST' && path === '/admin/result') return json(env, req, await adminScheduleResult(env, data));
        if (req.method === 'POST' && path === '/admin/config') return json(env, req, await adminConfig(env, data));
      }
      fail(404, 'မတွေ့ပါ။');
    } catch (e) {
      if (e instanceof ApiError) return json(env, req, { error: e.message }, e.status);
      console.error('freeplay_worker_error', e?.message || e);
      return json(env, req, { error: 'Server error. ပြန်စမ်းပါ။' }, 500);
    }
  }
};
