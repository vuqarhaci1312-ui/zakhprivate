import crypto from 'crypto';

function verifyToken(token) {
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

async function getFileSha(owner, repo, token) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content.json`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub read failed');
  const data = await res.json();
  return data.sha;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'No content' });

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'vuqarhaci1312-ui/zakhprivate';
  if (!ghToken) return res.status(503).json({ error: 'GITHUB_TOKEN not set' });

  const [owner, name] = repo.split('/');
  const sha = await getFileSha(owner, name, ghToken);
  const body = {
    message: 'Update site content via admin',
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    ...(sha ? { sha } : {})
  };

  const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/content.json`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!ghRes.ok) {
    const err = await ghRes.text();
    return res.status(500).json({ error: 'GitHub save failed', detail: err });
  }

  return res.status(200).json({ ok: true });
}
