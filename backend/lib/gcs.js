import { Storage } from '@google-cloud/storage';

const bucketName = process.env.GCS_BUCKET || 'zakher-travel-data';
const storage = new Storage();
const bucket = storage.bucket(bucketName);

export function getBucketName() {
  return bucketName;
}

export async function readJson(path) {
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return JSON.parse(buf.toString('utf8'));
}

export async function writeJson(path, data) {
  const file = bucket.file(path);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-store, max-age=0' }
  });
}

export async function writePdf(path, buffer, contentType = 'application/pdf') {
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: 'public, max-age=3600' }
  });
  try {
    await file.makePublic();
  } catch {}
}

export async function readPdf(path) {
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return buf;
}

export function getPublicPdfUrl(path) {
  return `https://storage.googleapis.com/${bucketName}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
