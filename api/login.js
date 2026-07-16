import crypto from 'crypto';

function createToken(username) {
  const exp = Date.now() + 30 * 60 * 1000;
  const payload = JSON.stringify({ u: username, exp });
  const sig = crypto.createHmac('sha256', process.env.TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.TOKEN_SECRET) {
    return res.status(503).json({ error: 'Server not configured' });
  }
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  return res.status(200).json({ token: createToken(username) });
}
