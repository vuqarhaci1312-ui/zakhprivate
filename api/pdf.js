export default async function handler(req, res) {
  const path = req.query.path;
  if (!path || !path.startsWith('pdfs/') || !path.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const repo = process.env.GITHUB_REPO || 'vuqarhaci1312-ui/zakhprivate';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${encoded}`;

  try {
    const ghRes = await fetch(url);
    if (!ghRes.ok) return res.status(404).json({ error: 'PDF not found' });
    const data = Buffer.from(await ghRes.arrayBuffer());
    const name = path.split('/').pop();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(data);
  } catch {
    return res.status(500).json({ error: 'PDF load failed' });
  }
}
