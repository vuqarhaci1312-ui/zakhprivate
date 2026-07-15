const STORAGE_KEY = 'zakher_content_v1';

function getContentUrl() {
  return window.location.pathname.includes('/admin') ? '../content.json' : 'content.json';
}

async function loadContent() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const res = await fetch(getContentUrl());
  return res.json();
}

function saveContent(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function exportContent(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content.json';
  a.click();
  URL.revokeObjectURL(url);
}

function resolvePdfUrl(pdf) {
  if (!pdf) return '#';
  if (pdf.startsWith('idb://')) return pdf;
  return pdf;
}
