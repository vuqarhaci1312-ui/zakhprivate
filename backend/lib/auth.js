import crypto from 'crypto';

export function createToken(username) {
  const exp = Date.now() + 30 * 60 * 1000;
  const payload = JSON.stringify({ u: username, exp });
  const sig = crypto.createHmac('sha256', process.env.TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

export function verifyToken(token) {
  if (!token || !process.env.TOKEN_SECRET) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString();
    const expected = crypto.createHmac('sha256', process.env.TOKEN_SECRET).update(payload).digest('hex');
    if (sig !== expected) return false;
    const data = JSON.parse(payload);
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
