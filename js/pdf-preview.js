let previewHistoryActive = false;
let pdfJsLoading = null;

function isMobilePdfDevice() {
  return window.matchMedia('(max-width: 734px), (hover: none) and (pointer: coarse)').matches;
}

function apiBase() {
  return (window.ZAKHER_API_BASE || '').replace(/\/$/, '');
}

function extractPdfPath(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    if (u.pathname.endsWith('/pdf') || u.pathname.includes('/pdf')) {
      return u.searchParams.get('path') || '';
    }
    const gcs = u.pathname.match(/\/(pdfs\/[^/]+\.pdf)$/i);
    if (gcs) return decodeURIComponent(gcs[1]);
  } catch {}
  const rel = String(url).match(/(pdfs\/[^?#]+\.pdf)/i);
  return rel ? rel[1] : '';
}

function previewFetchUrl(url, pdfPath) {
  const path = pdfPath || extractPdfPath(url);
  if (!path) return url;
  const base = apiBase();
  const q = '?path=' + encodeURIComponent(path);
  return base ? `${base}/pdf${q}` : `/api/pdf${q}`;
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsLoading) return pdfJsLoading;
  pdfJsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return pdfJsLoading;
}

function ensurePdfPreviewModal() {
  if (document.getElementById('pdf-preview-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'pdf-preview-modal';
  modal.className = 'pdf-preview-modal';
  modal.innerHTML = `
    <div class="pdf-preview-panel">
      <div class="pdf-preview-header">
        <span id="pdf-preview-title" class="pdf-preview-title"></span>
        <div class="pdf-preview-actions">
          <a id="pdf-preview-open" class="pdf-preview-open" href="#" target="_blank" rel="noopener">Yeni pəncərədə</a>
          <button type="button" id="pdf-preview-close" class="pdf-preview-close" aria-label="Bağla">✕</button>
        </div>
      </div>
      <div class="pdf-preview-body">
        <div id="pdf-preview-loading" class="pdf-preview-loading">Yüklənir…</div>
        <iframe id="pdf-preview-frame" class="pdf-preview-frame" title="PDF preview"></iframe>
        <div id="pdf-preview-scroll" class="pdf-preview-scroll"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closePdfPreview();
  });
  document.getElementById('pdf-preview-close').onclick = () => closePdfPreview();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePdfPreview();
  });
  window.addEventListener('popstate', () => {
    const m = document.getElementById('pdf-preview-modal');
    if (m?.classList.contains('show')) closePdfPreview(true);
  });
}

async function renderMobilePdf(url, pdfPath) {
  const scroll = document.getElementById('pdf-preview-scroll');
  const loading = document.getElementById('pdf-preview-loading');
  const frame = document.getElementById('pdf-preview-frame');
  frame.style.display = 'none';
  frame.src = 'about:blank';
  scroll.style.display = 'block';
  scroll.innerHTML = '';
  loading.style.display = 'flex';

  try {
    const pdfjsLib = await loadPdfJs();
    const fetchUrl = previewFetchUrl(url, pdfPath);
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error('fetch failed');
    const pdf = await pdfjsLib.getDocument({ data: await res.arrayBuffer() }).promise;
    const width = scroll.clientWidth || window.innerWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const baseVp = page.getViewport({ scale: 1 });
      const displayScale = Math.max((width - 16) / baseVp.width, 0.1);
      const vp = page.getViewport({ scale: displayScale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = Math.floor(vp.width) + 'px';
      canvas.style.height = Math.floor(vp.height) + 'px';
      canvas.className = 'pdf-preview-page';
      await page.render({
        canvasContext: ctx,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      }).promise;
      scroll.appendChild(canvas);
    }
  } catch {
    scroll.innerHTML = '<p class="pdf-preview-error">PDF yüklənmədi. "Yeni pəncərədə" sınayın.</p>';
  } finally {
    loading.style.display = 'none';
  }
}

function openPdfPreview(url, title, pdfPath) {
  ensurePdfPreviewModal();
  const modal = document.getElementById('pdf-preview-modal');
  const frame = document.getElementById('pdf-preview-frame');
  const scroll = document.getElementById('pdf-preview-scroll');
  const loading = document.getElementById('pdf-preview-loading');
  const wasOpen = modal.classList.contains('show');
  document.getElementById('pdf-preview-title').textContent = title || 'PDF';
  document.getElementById('pdf-preview-open').href = url;
  loading.style.display = 'none';

  if (isMobilePdfDevice()) {
    renderMobilePdf(url, pdfPath);
  } else {
    scroll.style.display = 'none';
    scroll.innerHTML = '';
    frame.style.display = 'block';
    frame.src = url;
  }

  modal.classList.add('show');
  document.body.classList.add('pdf-preview-open');
  if (!wasOpen) {
    history.pushState({ pdfPreview: true }, '');
    previewHistoryActive = true;
  }
}

function closePdfPreview(fromPopstate = false) {
  const modal = document.getElementById('pdf-preview-modal');
  if (!modal || !modal.classList.contains('show')) return;
  modal.classList.remove('show');
  document.body.classList.remove('pdf-preview-open');
  const frame = document.getElementById('pdf-preview-frame');
  const scroll = document.getElementById('pdf-preview-scroll');
  const loading = document.getElementById('pdf-preview-loading');
  if (frame) {
    frame.src = 'about:blank';
    frame.style.display = 'block';
  }
  if (scroll) {
    scroll.innerHTML = '';
    scroll.style.display = 'none';
  }
  if (loading) loading.style.display = 'none';
  if (previewHistoryActive) {
    previewHistoryActive = false;
    if (!fromPopstate) history.back();
  }
}

function initPdfPreviewLinks() {
  document.addEventListener('click', e => {
    if (document.body.classList.contains('edit-mode')) return;
    const link = e.target.closest('a.pdf-link');
    if (!link || !link.href || link.href === '#' || link.href.endsWith('#')) return;
    e.preventDefault();
    openPdfPreview(link.href, link.textContent.trim(), link.dataset.pdf);
  });
}

document.addEventListener('DOMContentLoaded', initPdfPreviewLinks);
