const ADMIN_AUTH = {
  username: 'zakher_admin',
  salt: 'zakher_travel_salt_2026_x9k2',
  hash: '2f8050fb86b3aaf1afa7aa9b25a6f63936750c11669fccc1153d5e1df8fca8e6',
  iterations: 100000,
  sessionKey: 'zakher_admin_session',
  lockKey: 'zakher_admin_lock',
  maxAttempts: 5,
  lockDuration: 15 * 60 * 1000,
  sessionDuration: 30 * 60 * 1000
};

const SITE_AUTH_DEFAULT = {
  username: 'zakher',
  salt: 'zakher_travel_salt_2026_x9k2',
  hash: '4325580ed9c490bdfd5ef74781bdec6fb715ca396f169319aa8c7eb502555fea',
  iterations: 100000,
  sessionKey: 'zakher_session',
  lockKey: 'zakher_lock',
  maxAttempts: 5,
  lockDuration: 15 * 60 * 1000,
  sessionDuration: 4 * 60 * 60 * 1000
};

let siteAuthConfig = null;

function getSiteAuth() {
  return siteAuthConfig || SITE_AUTH_DEFAULT;
}

async function initSiteAuth(force) {
  if (siteAuthConfig && !force) return siteAuthConfig;

  function apply(data) {
    if (data?.username && data?.hash && data?.salt) {
      siteAuthConfig = {
        ...SITE_AUTH_DEFAULT,
        username: String(data.username).trim().toLowerCase(),
        salt: String(data.salt),
        hash: String(data.hash),
        iterations: Number(data.iterations) || SITE_AUTH_DEFAULT.iterations
      };
      return siteAuthConfig;
    }
    return null;
  }

  function fetchT(url, ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return fetch(url, { cache: 'no-store', signal: c.signal }).finally(() => clearTimeout(t));
  }

  const localPath = window.location.pathname.includes('/admin') ? '../site-auth.json' : 'site-auth.json';
  for (const src of [localPath, '/api/site-auth']) {
    try {
      const res = await fetchT(src + '?t=' + Date.now(), 3000);
      if (!res.ok) continue;
      const r = apply(await res.json());
      if (r) return r;
    } catch {}
  }

  siteAuthConfig = { ...SITE_AUTH_DEFAULT };
  return siteAuthConfig;
}

async function _deriveHash(password, authCfg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(authCfg.salt), iterations: authCfg.iterations, hash: 'SHA-256' },
    key, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function _getLock(cfg) {
  try { return JSON.parse(localStorage.getItem(cfg.lockKey)); } catch { return null; }
}
function _setLock(cfg, attempts) {
  localStorage.setItem(cfg.lockKey, JSON.stringify({ attempts, lockedUntil: Date.now() + cfg.lockDuration }));
}
function _clearLock(cfg) { localStorage.removeItem(cfg.lockKey); }

function _isLocked(cfg) {
  const lock = _getLock(cfg);
  if (!lock) return false;
  if (lock.lockedUntil && Date.now() < lock.lockedUntil) return true;
  if (lock.lockedUntil && Date.now() >= lock.lockedUntil) _clearLock(cfg);
  return false;
}
function _lockRemaining(cfg) {
  const lock = _getLock(cfg);
  if (!lock?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((lock.lockedUntil - Date.now()) / 1000));
}

function _createSession(cfg) {
  const session = { token: crypto.randomUUID(), expires: Date.now() + cfg.sessionDuration, created: Date.now() };
  sessionStorage.setItem(cfg.sessionKey, JSON.stringify(session));
  return session;
}
function _getSession(cfg) {
  const raw = sessionStorage.getItem(cfg.sessionKey);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (Date.now() > s.expires) { sessionStorage.removeItem(cfg.sessionKey); return null; }
    s.expires = Date.now() + cfg.sessionDuration;
    sessionStorage.setItem(cfg.sessionKey, JSON.stringify(s));
    return s;
  } catch { sessionStorage.removeItem(cfg.sessionKey); return null; }
}
function _destroySession(cfg) { sessionStorage.removeItem(cfg.sessionKey); }

async function _attemptAuth(username, password, cfg) {
  if (_isLocked(cfg)) {
    return { ok: false, locked: true, remaining: _lockRemaining(cfg) };
  }
  await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
  const userOk = _timingSafeEqual(String(username).trim().toLowerCase(), cfg.username.trim().toLowerCase());
  const passHash = await _deriveHash(password, cfg);
  const passOk = _timingSafeEqual(passHash, cfg.hash);
  if (userOk && passOk) {
    _clearLock(cfg);
    _createSession(cfg);
    return { ok: true };
  }
  const lock = _getLock(cfg) || { attempts: 0 };
  lock.attempts = (lock.attempts || 0) + 1;
  if (lock.attempts >= cfg.maxAttempts) {
    _setLock(cfg, lock.attempts);
    return { ok: false, locked: true, remaining: _lockRemaining(cfg) };
  }
  localStorage.setItem(cfg.lockKey, JSON.stringify(lock));
  return { ok: false, attemptsLeft: cfg.maxAttempts - lock.attempts };
}

// ===== ADMIN panel functions =====
async function attemptLogin(username, password) {
  return _attemptAuth(username, password, ADMIN_AUTH);
}
function isAuthenticated() {
  return !!_getSession(ADMIN_AUTH);
}
function createSession() {
  return _createSession(ADMIN_AUTH);
}
function destroySession() {
  _destroySession(ADMIN_AUTH);
}

// ===== SITE gate functions =====
async function attemptSiteLogin(username, password) {
  let auth = getSiteAuth();
  if (!siteAuthConfig) {
    try { await initSiteAuth(); auth = getSiteAuth(); } catch {}
  }
  return _attemptAuth(username, password, auth);
}
function isSiteAuthenticated() {
  return !!_getSession(getSiteAuth());
}
function destroySiteSession() {
  _destroySession(getSiteAuth());
}

// ===== Change site password (from admin panel) =====
async function changeSitePassword(oldPassword, newPassword, confirmPassword) {
  await initSiteAuth();
  const auth = getSiteAuth();

  if (!oldPassword) throw new Error('Köhnə şifrə daxil edin');
  if (!newPassword || newPassword.length < 8) throw new Error('Yeni şifrə minimum 8 simvol olmalıdır');
  if (newPassword !== confirmPassword) throw new Error('Yeni şifrələr uyğun gəlmir');

  const oldHash = await _deriveHash(oldPassword, auth);
  if (!_timingSafeEqual(oldHash, auth.hash)) throw new Error('Köhnə şifrə yanlışdır');

  const token = sessionStorage.getItem(SAVE_TOKEN_KEY);
  if (!token) throw new Error('Server girişi lazımdır. /admin-dən yenidən daxil olun.');

  const res = await fetch(apiUrl('/site-auth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Şifrə yenilənmədi');

  if (data.auth) {
    siteAuthConfig = {
      ...SITE_AUTH_DEFAULT,
      username: data.auth.username,
      salt: data.auth.salt,
      hash: data.auth.hash,
      iterations: data.auth.iterations || SITE_AUTH_DEFAULT.iterations
    };
  } else {
    await initSiteAuth(true);
  }
  return { ok: true };
}
