const PDF_DB_NAME = 'zakher_pdfs';
const PDF_STORE = 'files';
const GH_RAW = 'https://raw.githubusercontent.com/vuqarhaci1312-ui/zakhprivate/main/';

function gcsPdfUrl(path) {
  const base = window.ZAKHER_GCS_PDF_BASE;
  if (base) return base.replace(/\/$/, '') + '/' + path.split('/').map(encodeURIComponent).join('/');
  const bucket = window.ZAKHER_GCS_BUCKET || 'zakher-travel-data';
  return `https://storage.googleapis.com/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function apiBase() {
  return (window.ZAKHER_API_BASE || '').replace(/\/$/, '');
}

function openPdfDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PDF_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PDF_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storePdf(path, file) {
  const db = await openPdfDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readwrite');
    tx.objectStore(PDF_STORE).put(file, path);
    tx.oncomplete = () => resolve(path);
    tx.onerror = () => reject(tx.error);
  });
}

async function getPdfBlob(path) {
  const db = await openPdfDb();
  return new Promise((resolve) => {
    const tx = db.transaction(PDF_STORE, 'readonly');
    const req = tx.objectStore(PDF_STORE).get(path);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

const blobCache = {};

function pdfApiUrl(path) {
  const base = apiBase();
  const q = '?path=' + encodeURIComponent(path);
  return base ? `${base}/pdf${q}` : `/api/pdf${q}`;
}

async function resolvePdfUrl(pdf) {
  if (!pdf) return '#';
  const blob = await getPdfBlob(pdf);
  if (blob) {
    if (!blobCache[pdf]) blobCache[pdf] = URL.createObjectURL(blob);
    return blobCache[pdf];
  }
  if (pdf.startsWith('pdfs/')) {
    if (window.ZAKHER_GCS_BUCKET || window.ZAKHER_GCS_PDF_BASE) return gcsPdfUrl(pdf);
    return pdfApiUrl(pdf);
  }
  return GH_RAW + pdf.split('/').map(encodeURIComponent).join('/');
}
