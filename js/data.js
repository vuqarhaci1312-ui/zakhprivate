const STORAGE_KEY = 'zakher_content_v1';
const SAVE_TOKEN_KEY = 'zakher_save_token';
const GH_RAW = 'https://raw.githubusercontent.com/vuqarhaci1312-ui/zakhprivate/main/content.json';

function getContentUrl() {
  return window.location.pathname.includes('/admin') ? '../content.json' : 'content.json';
}

async function fetchRemoteContent() {
  try {
    const res = await fetch(`${GH_RAW}?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch {}
  const res = await fetch(getContentUrl() + '?t=' + Date.now());
  return res.json();
}

async function loadContent() {
  return fetchRemoteContent();
}

async function saveContent(data) {
  const token = sessionStorage.getItem(SAVE_TOKEN_KEY);
  if (token) {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: data })
    });
    if (res.ok) {
      localStorage.removeItem(STORAGE_KEY);
      return { ok: true, remote: true };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Server save failed');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return { ok: true, remote: false };
}

async function serverLogin(username, password) {
  const res = await fetch('/api/login', {
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

function exportContent(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content.json';
  a.click();
  URL.revokeObjectURL(url);
}
