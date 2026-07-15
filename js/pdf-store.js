const PDF_DB_NAME = 'zakher_pdfs';
const PDF_STORE = 'files';

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

async function resolvePdfUrl(pdf) {
  if (!pdf) return '#';
  const blob = await getPdfBlob(pdf);
  if (blob) {
    if (!blobCache[pdf]) blobCache[pdf] = URL.createObjectURL(blob);
    return blobCache[pdf];
  }
  return pdf;
}
