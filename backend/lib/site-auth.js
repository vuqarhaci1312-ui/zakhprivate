import crypto from 'crypto';

export const DEFAULT_SITE_AUTH = {
  username: 'zakher',
  salt: 'zakher_travel_salt_2026_x9k2',
  hash: '4325580ed9c490bdfd5ef74781bdec6fb715ca396f169319aa8c7eb502555fea',
  iterations: 100000
};

export function deriveHash(password, salt, iterations = DEFAULT_SITE_AUTH.iterations) {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function verifySitePassword(password, auth) {
  const hash = deriveHash(password, auth.salt, auth.iterations);
  return timingSafeEqual(hash, auth.hash);
}

export function validateNewPassword(newPassword, confirmPassword) {
  if (!newPassword || newPassword.length < 8) {
    return 'Yeni şifrə minimum 8 simvol olmalıdır';
  }
  if (newPassword !== confirmPassword) {
    return 'Yeni şifrələr uyğun gəlmir';
  }
  return null;
}

export function createSiteAuthRecord(username, password, salt = crypto.randomBytes(16).toString('hex')) {
  const iterations = DEFAULT_SITE_AUTH.iterations;
  return {
    username,
    salt,
    hash: deriveHash(password, salt, iterations),
    iterations
  };
}
