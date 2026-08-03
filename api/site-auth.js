import crypto from 'crypto';

const DEFAULT_SITE_AUTH = {
  username: 'zakher',
  salt: 'zakher_travel_salt_2026_x9k2',
  hash: '4325580ed9c490bdfd5ef74781bdec6fb715ca396f169319aa8c7eb502555fea',
  iterations: 100000
};

function deriveHash(password, salt, iterations) {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

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

async function readGithubFile(owner, name, path, token) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub read failed');
  const data = await res.json();
  return { json: JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')), sha: data.sha };
}

async function writeGithubFile(owner, name, path, token, json, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(json, null, 2)).toString('base64'),
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'GitHub save failed');
  }
}

export default async function handler(req, res) {
  const repo = process.env.GITHUB_REPO || 'vuqarhaci1312-ui/zakhprivate';
  const [owner, name] = repo.split('/');

  if (req.method === 'GET') {
    try {
      const ghToken = process.env.GITHUB_TOKEN;
      if (ghToken) {
        const file = await readGithubFile(owner, name, 'site-auth.json', ghToken);
        if (file?.json?.username && file?.json?.hash) {
          res.setHeader('Cache-Control', 'no-store, max-age=0');
          return res.status(200).json(file.json);
        }
      }
    } catch {}
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json(DEFAULT_SITE_AUTH);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  const { oldPassword, newPassword, confirmPassword } = req.body || {};
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Bütün sahələri doldurun' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Yeni şifrə minimum 8 simvol olmalıdır' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Yeni şifrələr uyğun gəlmir' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) return res.status(503).json({ error: 'Server konfiqurasiya edilməyib' });

  try {
    const file = await readGithubFile(owner, name, 'site-auth.json', ghToken);
    const current = file?.json || DEFAULT_SITE_AUTH;
    const oldHash = deriveHash(oldPassword, current.salt, current.iterations);
    if (!timingSafeEqual(oldHash, current.hash)) {
      return res.status(401).json({ error: 'Köhnə şifrə yanlışdır' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const updated = {
      username: current.username,
      salt,
      hash: deriveHash(newPassword, salt, current.iterations),
      iterations: current.iterations
    };

    await writeGithubFile(
      owner,
      name,
      'site-auth.json',
      ghToken,
      updated,
      file?.sha,
      'Update site password via admin'
    );

    return res.status(200).json({ ok: true, auth: updated });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Şifrə yenilənmədi' });
  }
}
