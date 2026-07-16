export default async function handler(req, res) {
  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'vuqarhaci1312-ui/zakhprivate';
  const [owner, name] = repo.split('/');
  const headers = { Accept: 'application/vnd.github+json' };
  if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/content.json`, { headers });
    if (!ghRes.ok) throw new Error('GitHub read failed');
    const file = await ghRes.json();
    const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json(content);
  } catch {
    return res.status(500).json({ error: 'Content load failed' });
  }
}
