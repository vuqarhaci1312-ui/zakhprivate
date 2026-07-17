const SAVE_TOKEN_KEY = 'zakher_save_token';

function apiBase() {
  return (window.ZAKHER_API_BASE || '').replace(/\/$/, '');
}

function apiUrl(path) {
  const base = apiBase();
  return base ? `${base}${path}` : `/api${path}`;
}

function getContentUrl() {
  return window.location.pathname.includes('/admin') ? '../content.json' : 'content.json';
}

function hasSaveToken() {
  return !!sessionStorage.getItem(SAVE_TOKEN_KEY);
}

async function loadContent() {
  try {
    const res = await fetch(apiUrl('/content') + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch {}
  const res = await fetch(getContentUrl() + '?t=' + Date.now(), { cache: 'no-store' });
  return res.json();
}

async function saveContent(data) {
  const token = sessionStorage.getItem(SAVE_TOKEN_KEY);
  if (!token) throw new Error('Server girişi lazımdır. /admin-dən yenidən daxil olun.');

  const res = await fetch(apiUrl('/save'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content: data })
  });
  if (res.ok) return { ok: true, remote: true };
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || 'Server save failed');
}

async function serverLogin(username, password) {
  const res = await fetch(apiUrl('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) return { ok: false };
  const data = await res.json();
  sessionStorage.setItem(SAVE_TOKEN_KEY, data.token);
  return { ok: true };
}

function clearSaveToken() {
  sessionStorage.removeItem(SAVE_TOKEN_KEY);
}

async function uploadPdf(path, file) {
  const token = sessionStorage.getItem(SAVE_TOKEN_KEY);
  if (!token) throw new Error('Server girişi lazımdır. /admin-dən yenidən daxil olun.');
  if (file.size > 20 * 1024 * 1024) throw new Error('PDF çox böyükdür (max 20MB).');

  const form = new FormData();
  form.append('path', path);
  form.append('file', file);
  const res = await fetch(apiUrl('/upload-pdf'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'PDF upload failed');
  }
  return res.json();
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
