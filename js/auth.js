const AUTH = {
  username: 'zakher_admin',
  salt: 'zakher_travel_salt_2026_x9k2',
  hash: '2f8050fb86b3aaf1afa7aa9b25a6f63936750c11669fccc1153d5e1df8fca8e6',
  iterations: 100000,
  sessionKey: 'zakher_session',
  lockKey: 'zakher_lock',
  maxAttempts: 5,
  lockDuration: 15 * 60 * 1000,
  sessionDuration: 30 * 60 * 1000
};

async function deriveHash(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(AUTH.salt), iterations: AUTH.iterations, hash: 'SHA-256' },
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
  const raw = localStorage.getItem(AUTH.lockKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLock(attempts) {
  localStorage.setItem(AUTH.lockKey, JSON.stringify({ attempts, lockedUntil: Date.now() + AUTH.lockDuration }));
}

function clearLock() {
  localStorage.removeItem(AUTH.lockKey);
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
  const session = { token, expires: Date.now() + AUTH.sessionDuration, created: Date.now() };
  sessionStorage.setItem(AUTH.sessionKey, JSON.stringify(session));
  return session;
}

function getSession() {
  const raw = sessionStorage.getItem(AUTH.sessionKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expires) {
      sessionStorage.removeItem(AUTH.sessionKey);
      return null;
    }
    session.expires = Date.now() + AUTH.sessionDuration;
    sessionStorage.setItem(AUTH.sessionKey, JSON.stringify(session));
    return session;
  } catch {
    sessionStorage.removeItem(AUTH.sessionKey);
    return null;
  }
}

function destroySession() {
  sessionStorage.removeItem(AUTH.sessionKey);
}

async function attemptLogin(username, password) {
  if (isLocked()) {
    return { ok: false, locked: true, remaining: getLockRemaining() };
  }

  await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

  const userOk = timingSafeEqual(username, AUTH.username);
  const passHash = await deriveHash(password);
  const passOk = timingSafeEqual(passHash, AUTH.hash);

  if (userOk && passOk) {
    clearLock();
    createSession();
    return { ok: true };
  }

  const lock = getLock() || { attempts: 0 };
  lock.attempts = (lock.attempts || 0) + 1;
  if (lock.attempts >= AUTH.maxAttempts) {
    setLock(lock.attempts);
    return { ok: false, locked: true, remaining: getLockRemaining() };
  }
  localStorage.setItem(AUTH.lockKey, JSON.stringify(lock));
  return { ok: false, attemptsLeft: AUTH.maxAttempts - lock.attempts };
}

function isAuthenticated() {
  return !!getSession();
}
