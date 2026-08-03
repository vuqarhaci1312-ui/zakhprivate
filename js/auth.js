const DEFAULT_AUTH = {
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

function getActiveAuth() {
  return siteAuthConfig || DEFAULT_AUTH;
}

async function initSiteAuth(force = false) {
  if (siteAuthConfig && !force) return siteAuthConfig;

  async function applyConfig(data) {
    if (data?.username && data?.hash && data?.salt) {
      siteAuthConfig = {
        ...DEFAULT_AUTH,
        username: data.username,
        salt: data.salt,
        hash: data.hash,
        iterations: data.iterations || DEFAULT_AUTH.iterations
      };
      return siteAuthConfig;
    }
    return null;
  }

  try {
    const res = await fetch(apiUrl('/site-auth') + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const applied = await applyConfig(await res.json());
      if (applied) return applied;
    }
  } catch {}

  try {
    const localPath = window.location.pathname.includes('/admin') ? '../site-auth.json' : 'site-auth.json';
    const res = await fetch(localPath + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const applied = await applyConfig(await res.json());
      if (applied) return applied;
    }
  } catch {}

  siteAuthConfig = { ...DEFAULT_AUTH };
  return siteAuthConfig;
}

async function deriveHash(password, auth) {
  const cfg = auth || getActiveAuth();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(cfg.salt), iterations: cfg.iterations, hash: 'SHA-256' },
    key,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function getLock() {
  const raw = localStorage.getItem(DEFAULT_AUTH.lockKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLock(attempts) {
  localStorage.setItem(DEFAULT_AUTH.lockKey, JSON.stringify({
    attempts,
    lockedUntil: Date.now() + DEFAULT_AUTH.lockDuration
  }));
}

function clearLock() {
  localStorage.removeItem(DEFAULT_AUTH.lockKey);
}

function isLocked() {
  const lock = getLock();
  if (!lock) return false;
  if (lock.lockedUntil && Date.now() < lock.lockedUntil) return true;
  if (lock.lockedUntil && Date.now() >= lock.lockedUntil) clearLock();
  return false;
}

function getLockRemaining() {
  const lock = getLock();
  if (!lock || !lock.lockedUntil) return 0;
  return Math.max(0, Math.ceil((lock.lockedUntil - Date.now()) / 1000));
}

function createSession() {
  const token = crypto.randomUUID();
  const session = {
    token,
    expires: Date.now() + DEFAULT_AUTH.sessionDuration,
    created: Date.now()
  };
  sessionStorage.setItem(DEFAULT_AUTH.sessionKey, JSON.stringify(session));
  return session;
}

function getSession() {
  const raw = sessionStorage.getItem(DEFAULT_AUTH.sessionKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expires) {
      sessionStorage.removeItem(DEFAULT_AUTH.sessionKey);
      return null;
    }
    session.expires = Date.now() + DEFAULT_AUTH.sessionDuration;
    sessionStorage.setItem(DEFAULT_AUTH.sessionKey, JSON.stringify(session));
    return session;
  } catch {
    sessionStorage.removeItem(DEFAULT_AUTH.sessionKey);
    return null;
  }
}

function destroySession() {
  sessionStorage.removeItem(DEFAULT_AUTH.sessionKey);
}

async function attemptLogin(username, password) {
  await initSiteAuth();
  const auth = getActiveAuth();

  if (isLocked()) {
    return { ok: false, locked: true, remaining: getLockRemaining() };
  }

  await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

  const userOk = timingSafeEqual(username, auth.username);
  const passHash = await deriveHash(password, auth);
  const passOk = timingSafeEqual(passHash, auth.hash);

  if (userOk && passOk) {
    clearLock();
    createSession();
    return { ok: true };
  }

  const lock = getLock() || { attempts: 0 };
  lock.attempts = (lock.attempts || 0) + 1;
  if (lock.attempts >= DEFAULT_AUTH.maxAttempts) {
    setLock(lock.attempts);
    return { ok: false, locked: true, remaining: getLockRemaining() };
  }
  localStorage.setItem(DEFAULT_AUTH.lockKey, JSON.stringify(lock));
  return { ok: false, attemptsLeft: DEFAULT_AUTH.maxAttempts - lock.attempts };
}

async function changeSitePassword(oldPassword, newPassword, confirmPassword) {
  await initSiteAuth();
  const auth = getActiveAuth();

  if (!oldPassword) throw new Error('Köhnə şifrə daxil edin');
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Yeni şifrə minimum 8 simvol olmalıdır');
  }
  if (newPassword !== confirmPassword) {
    throw new Error('Yeni şifrələr uyğun gəlmir');
  }

  const oldHash = await deriveHash(oldPassword, auth);
  if (!timingSafeEqual(oldHash, auth.hash)) {
    throw new Error('Köhnə şifrə yanlışdır');
  }

  const token = sessionStorage.getItem(SAVE_TOKEN_KEY);
  if (!token) throw new Error('Server girişi lazımdır. /admin-dən yenidən daxil olun.');

  const res = await fetch(apiUrl('/site-auth'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Şifrə yenilənmədi');

  if (data.auth) {
    siteAuthConfig = {
      ...DEFAULT_AUTH,
      username: data.auth.username,
      salt: data.auth.salt,
      hash: data.auth.hash,
      iterations: data.auth.iterations || DEFAULT_AUTH.iterations
    };
  } else {
    await initSiteAuth(true);
  }

  return { ok: true };
}

function isAuthenticated() {
  return !!getSession();
}
