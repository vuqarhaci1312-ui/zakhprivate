let previewHistoryActive = false;

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
      <iframe id="pdf-preview-frame" class="pdf-preview-frame" title="PDF preview"></iframe>
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

function openPdfPreview(url, title) {
  ensurePdfPreviewModal();
  const modal = document.getElementById('pdf-preview-modal');
  const frame = document.getElementById('pdf-preview-frame');
  const wasOpen = modal.classList.contains('show');
  document.getElementById('pdf-preview-title').textContent = title || 'PDF';
  document.getElementById('pdf-preview-open').href = url;
  frame.src = url;
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
  if (frame) frame.src = 'about:blank';
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
    openPdfPreview(link.href, link.textContent.trim());
  });
}

document.addEventListener('DOMContentLoaded', initPdfPreviewLinks);
