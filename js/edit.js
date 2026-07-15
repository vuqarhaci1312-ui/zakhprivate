let editData = null;

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function setByPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = keys[i + 1];
    if (!isNaN(next)) {
      cur = cur[k];
    } else {
      cur = cur[k];
    }
  }
  cur[keys[keys.length - 1]] = value;
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function parseRichParagraph(el) {
  const parts = [];
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent;
      if (t) parts.push({ type: 'text', value: t });
    } else if (node.nodeName === 'A') {
      parts.push({
        type: 'link',
        text: node.textContent,
        href: node.dataset.pdf || node.getAttribute('href')
      });
    }
  });
  if (!parts.some(p => p.type === 'link') && parts.length === 1 && parts[0].type === 'text') {
    return { type: 'text', content: parts[0].value };
  }
  return { type: 'rich', parts };
}

function collectFromDOM() {
  const data = JSON.parse(JSON.stringify(editData));

  document.querySelectorAll('[data-edit]').forEach(el => {
    const path = el.dataset.edit;
    if (path.includes('.packages')) return;
    if (path.includes('.info.') && el.dataset.rich) {
      setByPath(data, path, parseRichParagraph(el));
    } else if (path.includes('.info.')) {
      setByPath(data, path, { type: 'text', content: el.textContent.trim() });
    } else if (path.endsWith('.email') && el.tagName === 'A') {
      setByPath(data, path, el.textContent.trim());
    } else if (path !== 'credit' || el.classList.contains('credit')) {
      if (!path.includes('.info.')) {
        setByPath(data, path, el.textContent.trim());
      }
    }
  });

  document.querySelectorAll('.country-section').forEach(section => {
    const idx = +section.dataset.countryIdx;
    const packages = [];
    section.querySelectorAll('.packages li').forEach((li, pi) => {
      const a = li.querySelector('a.pdf-link');
      const validity = li.querySelector('.validity');
      const existing = editData.countries[idx]?.packages?.[pi];
      packages.push({
        id: existing?.id || uid(),
        title: a.textContent.trim(),
        pdf: a.dataset.pdf || a.getAttribute('href'),
        validity: validity.textContent.trim()
      });
    });
    data.countries[idx].packages = packages;
  });

  return data;
}

function createToolbar() {
  const bar = document.createElement('div');
  bar.id = 'edit-toolbar';
  bar.innerHTML = `
    <span class="edit-badge">✎ Redaktə rejimi</span>
    <span class="edit-hint">Mətnə kliklə · Söz seç → Link et · Paketdə PDF düyməsi</span>
    <div class="edit-actions">
      <button type="button" id="btn-add-link" class="et-btn" disabled>Link et</button>
      <button type="button" id="btn-save" class="et-btn et-save">Yadda saxla</button>
      <button type="button" id="btn-export" class="et-btn">Export</button>
      <button type="button" id="btn-exit" class="et-btn et-exit">Çıxış</button>
    </div>
  `;
  document.body.appendChild(bar);
  return bar;
}

function createLinkModal() {
  const m = document.createElement('div');
  m.id = 'link-modal';
  m.className = 'edit-modal';
  m.innerHTML = `
    <div class="edit-modal-box">
      <h3>PDF Link yarat</h3>
      <p class="modal-selected" id="modal-selected-text"></p>
      <label>PDF yüklə</label>
      <input type="file" id="modal-pdf-file" accept=".pdf">
      <p class="modal-or">və ya mövcud yol:</p>
      <input type="text" id="modal-pdf-path" placeholder="pdfs/fayl-adi.pdf">
      <div class="modal-btns">
        <button type="button" id="modal-cancel" class="et-btn">Ləğv</button>
        <button type="button" id="modal-confirm" class="et-btn et-save">Link yarat</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  return m;
}

function createPdfModal() {
  const m = document.createElement('div');
  m.id = 'pdf-modal';
  m.className = 'edit-modal';
  m.innerHTML = `
    <div class="edit-modal-box">
      <h3>PDF dəyiş</h3>
      <p id="pdf-modal-title"></p>
      <label>Yeni PDF yüklə</label>
      <input type="file" id="pdf-modal-file" accept=".pdf">
      <p class="modal-or">və ya yol daxil et:</p>
      <input type="text" id="pdf-modal-path" placeholder="pdfs/fayl-adi.pdf">
      <div class="modal-btns">
        <button type="button" id="pdf-modal-cancel" class="et-btn">Ləğv</button>
        <button type="button" id="pdf-modal-confirm" class="et-btn et-save">Tətbiq et</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  return m;
}

let selectedRange = null;
let activeLinkAnchor = null;

function getSelectionInEditable() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const el = container.nodeType === 3 ? container.parentElement : container;
  const editable = el.closest('[contenteditable="true"]');
  if (!editable) return null;
  return { range: range.cloneRange(), text: sel.toString(), editable };
}

async function applyLinkToSelection(pdfPath, file) {
  if (!selectedRange) return;
  const path = pdfPath.startsWith('pdfs/') ? pdfPath : 'pdfs/' + pdfPath.replace(/^.*\//, '');
  if (file) await storePdf(path, file);
  const url = await resolvePdfUrl(path);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.textContent = selectedRange.text;
  a.dataset.pdf = path;
  a.className = 'pdf-link';
  selectedRange.range.deleteContents();
  selectedRange.range.insertNode(a);
  window.getSelection().removeAllRanges();
  document.getElementById('btn-add-link').disabled = true;
}

async function applyPdfToAnchor(anchor, pdfPath, file) {
  const path = pdfPath.startsWith('pdfs/') ? pdfPath : 'pdfs/' + pdfPath.replace(/^.*\//, '');
  if (file) await storePdf(path, file);
  const url = await resolvePdfUrl(path);
  anchor.href = url;
  anchor.dataset.pdf = path;
}

function enableEditables() {
  document.querySelectorAll('[data-edit]').forEach(el => {
    if (el.closest('.contact a[data-edit]') && el.tagName === 'A') {
      el.contentEditable = 'true';
      el.addEventListener('click', e => e.preventDefault());
      return;
    }
    if (el.tagName === 'A' && el.classList.contains('pdf-link')) return;
    el.contentEditable = 'true';
    el.spellcheck = false;
  });

  document.querySelectorAll('a.pdf-link').forEach(a => {
    a.contentEditable = 'true';
    a.addEventListener('click', e => {
      if (document.body.classList.contains('edit-mode')) e.preventDefault();
    });
  });

  document.querySelectorAll('.validity').forEach(s => {
    s.contentEditable = 'true';
    s.spellcheck = false;
  });
}

function bindPackageActions() {
  document.querySelectorAll('.pkg-pdf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.closest('li');
      activeLinkAnchor = li.querySelector('a.pdf-link');
      document.getElementById('pdf-modal-title').textContent = activeLinkAnchor.textContent;
      document.getElementById('pdf-modal-path').value = activeLinkAnchor.dataset.pdf || '';
      document.getElementById('pdf-modal-file').value = '';
      document.getElementById('pdf-modal').classList.add('show');
    });
  });

  document.querySelectorAll('.pkg-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Bu paketi silmək istəyirsiniz?')) return;
      btn.closest('li').remove();
    });
  });
}

function addPackageButtons() {
  document.querySelectorAll('.country-section').forEach(section => {
    const ul = section.querySelector('.packages');
    if (!ul) return;
    let addBtn = section.querySelector('.add-pkg-btn');
    if (!addBtn) {
      addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-pkg-btn';
      addBtn.textContent = '+ Yeni paket əlavə et';
      ul.after(addBtn);
    }
    addBtn.onclick = () => {
      const idx = section.dataset.countryIdx;
      const pkgCount = ul.querySelectorAll('li').length;
      const path = `countries.${idx}.packages.${pkgCount}`;
      const li = document.createElement('li');
      li.dataset.edit = path;
      li.innerHTML = `
        <a href="#" class="pdf-link" data-pdf="pdfs/yeni-paket.pdf" data-field="title" contenteditable="true">Yeni paket</a>
        <span class="validity" data-field="validity" contenteditable="true">01.01.2026-31.12.2026 Validity</span>
        <div class="pkg-edit-actions">
          <button type="button" class="pkg-btn pkg-pdf-btn" title="PDF dəyiş">PDF</button>
          <button type="button" class="pkg-btn pkg-del-btn" title="Sil">✕</button>
        </div>
      `;
      ul.appendChild(li);
      bindPackageActions();
      li.querySelector('a').focus();
    };
  });
}

function showToast(msg) {
  let t = document.getElementById('edit-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'edit-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function initEditMode(data) {
  editData = data;
  document.body.classList.add('edit-mode');
  createToolbar();
  createLinkModal();
  createPdfModal();
  enableEditables();
  bindPackageActions();
  addPackageButtons();

  const btnLink = document.getElementById('btn-add-link');

  document.addEventListener('selectionchange', () => {
    const sel = getSelectionInEditable();
    selectedRange = sel;
    btnLink.disabled = !sel || sel.text.length < 1;
  });

  btnLink.addEventListener('click', () => {
    const sel = getSelectionInEditable();
    if (!sel) return;
    selectedRange = sel;
    document.getElementById('modal-selected-text').textContent = `Seçilmiş: "${sel.text}"`;
    document.getElementById('modal-pdf-file').value = '';
    document.getElementById('modal-pdf-path').value = '';
    document.getElementById('link-modal').classList.add('show');
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('link-modal').classList.remove('show');
  });

  document.getElementById('modal-confirm').addEventListener('click', async () => {
    const file = document.getElementById('modal-pdf-file').files[0];
    let path = document.getElementById('modal-pdf-path').value.trim();
    if (file) path = 'pdfs/' + file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
    if (!path) { showToast('PDF seçin və ya yol daxil edin'); return; }
    await applyLinkToSelection(path, file);
    document.getElementById('link-modal').classList.remove('show');
    showToast('Link yaradıldı');
  });

  document.getElementById('pdf-modal-cancel').addEventListener('click', () => {
    document.getElementById('pdf-modal').classList.remove('show');
  });

  document.getElementById('pdf-modal-confirm').addEventListener('click', async () => {
    const file = document.getElementById('pdf-modal-file').files[0];
    let path = document.getElementById('pdf-modal-path').value.trim();
    if (file) path = 'pdfs/' + file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
    if (!path || !activeLinkAnchor) { showToast('PDF seçin'); return; }
    await applyPdfToAnchor(activeLinkAnchor, path, file);
    document.getElementById('pdf-modal').classList.remove('show');
    showToast('PDF yeniləndi');
  });

  document.querySelectorAll('.edit-modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    editData = collectFromDOM();
    saveContent(editData);
    showToast('Yadda saxlanıldı');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    editData = collectFromDOM();
    saveContent(editData);
    exportContent(editData);
    showToast('content.json yükləndi');
  });

  document.getElementById('btn-exit').addEventListener('click', () => {
    destroySession();
    location.href = location.pathname;
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      editData = collectFromDOM();
      saveContent(editData);
      showToast('Yadda saxlanıldı');
    }
  });
}
