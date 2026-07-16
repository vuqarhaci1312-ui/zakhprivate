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

async function getFileSha(owner, repo, filePath, ghToken) {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encoded}`, {
    headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' }
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

  const { path, data } = req.body || {};
  if (!path || !data) return res.status(400).json({ error: 'Path and data required' });
  if (!path.startsWith('pdfs/') || !path.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid PDF path' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'vuqarhaci1312-ui/zakhprivate';
  if (!ghToken) return res.status(503).json({ error: 'GITHUB_TOKEN not set' });

  const [owner, name] = repo.split('/');
  const encoded = path.split('/').map(encodeURIComponent).join('/');

  try {
    const sha = await getFileSha(owner, name, path, ghToken);
    const body = {
      message: `Upload PDF: ${path}`,
      content: data,
      ...(sha ? { sha } : {})
    };

    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${encoded}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({}));
      const msg = err.message || 'GitHub upload failed';
      if (ghRes.status === 401) return res.status(500).json({ error: 'GitHub token etibarsızdır.' });
      if (ghRes.status === 403) return res.status(500).json({ error: 'GitHub tokenin yazma icazəsi yoxdur.' });
      return res.status(500).json({ error: 'PDF upload failed: ' + msg });
    }

    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Upload failed' });
  }
}
