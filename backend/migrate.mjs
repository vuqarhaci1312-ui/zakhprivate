import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const bucketName = process.env.GCS_BUCKET || 'zakher-travel-data';
const ghRaw = process.env.GH_RAW || 'https://raw.githubusercontent.com/vuqarhaci1312-ui/zakhprivate/main/';
const storage = new Storage();
const bucket = storage.bucket(bucketName);

function collectPdfPaths(obj, out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;
  if (typeof obj.pdf === 'string' && obj.pdf.startsWith('pdfs/')) out.add(obj.pdf);
  if (typeof obj.href === 'string' && obj.href.startsWith('pdfs/')) out.add(obj.href);
  for (const v of Object.values(obj)) collectPdfPaths(v, out);
  return out;
}

async function uploadJson() {
  const local = path.join(root, 'content.json');
  const content = JSON.parse(fs.readFileSync(local, 'utf8'));
  await bucket.file('content.json').save(JSON.stringify(content, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-store, max-age=0' }
  });
  console.log('Uploaded content.json');
  return content;
}

async function uploadPdf(pdfPath) {
  const file = bucket.file(pdfPath);
  const [exists] = await file.exists();
  if (exists) {
    console.log('Skip (exists):', pdfPath);
    return;
  }
  const url = ghRaw + pdfPath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${pdfPath}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await file.save(buf, {
    contentType: 'application/pdf',
    metadata: { cacheControl: 'public, max-age=3600' }
  });
  try {
    await file.makePublic();
  } catch {}
  console.log('Uploaded:', pdfPath);
}

const content = await uploadJson();
const pdfs = [...collectPdfPaths(content)];
console.log(`Migrating ${pdfs.length} PDFs...`);
for (const p of pdfs) {
  try {
    await uploadPdf(p);
  } catch (e) {
    console.error('Failed:', p, e.message);
  }
}
console.log('Done.');
