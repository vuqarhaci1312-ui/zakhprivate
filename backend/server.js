import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createToken, authMiddleware } from './lib/auth.js';
import { readJson, writeJson, writePdf, readPdf, getPublicPdfUrl } from './lib/gcs.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  'https://zakherprivate.vercel.app,https://zakhprivate.vercel.app,http://localhost:8080,http://127.0.0.1:8080'
).split(',').map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked'));
  }
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.TOKEN_SECRET) {
    return res.status(503).json({ error: 'Server not configured' });
  }
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.json({ token: createToken(username) });
});

app.get('/content', async (_req, res) => {
  try {
    const content = await readJson('content.json');
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.set('Cache-Control', 'no-store, max-age=0');
    return res.json(content);
  } catch (e) {
    return res.status(500).json({ error: 'Content load failed', detail: e.message });
  }
});

app.post('/save', authMiddleware, async (req, res) => {
  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'No content' });
  try {
    await writeJson('content.json', content);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Save failed', detail: e.message });
  }
});

app.post('/upload-pdf', authMiddleware, upload.single('file'), async (req, res) => {
  let path = req.body?.path || '';
  if (!path.startsWith('pdfs/')) path = 'pdfs/' + path.split('/').pop();
  if (!path.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid PDF path' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    await writePdf(path, req.file.buffer, req.file.mimetype || 'application/pdf');
    return res.json({ ok: true, path, url: getPublicPdfUrl(path) });
  } catch (e) {
    return res.status(500).json({ error: 'PDF upload failed', detail: e.message });
  }
});

app.get('/pdf', async (req, res) => {
  const path = req.query.path;
  if (!path || !path.startsWith('pdfs/') || !path.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  try {
    const data = await readPdf(path);
    if (!data) return res.status(404).json({ error: 'PDF not found' });
    const name = path.split('/').pop();
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${name}"`);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(data);
  } catch (e) {
    return res.status(500).json({ error: 'PDF load failed', detail: e.message });
  }
});

app.get('/pdf-url', (req, res) => {
  const path = req.query.path;
  if (!path || !path.startsWith('pdfs/')) return res.status(400).json({ error: 'Invalid path' });
  return res.json({ url: getPublicPdfUrl(path) });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`zakher-api listening on ${port}`));
