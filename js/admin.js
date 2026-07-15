let contentData = null;
let activePanel = 'hero';
let isDirty = false;
let modalCallback = null;

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  footer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
};

const PANEL_META = {
  hero: { title: 'Başlıq və Təsvir', desc: 'Saytın əsas başlıqları', breadcrumb: 'Ümumi', icon: 'home' },
  footer: { title: 'Footer', desc: 'Səhifənin alt yazısı', breadcrumb: 'Ümumi', icon: 'footer' }
};

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.innerHTML = (type === 'success' ? ICONS.check : '') + msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function setDirty(val = true) {
  isDirty = val;
  const el = document.getElementById('save-status');
  if (val) {
    el.textContent = 'Yadda saxlanılmayıb';
    el.className = 'save-status unsaved';
  } else {
    el.textContent = 'Yadda saxlanılıb';
    el.className = 'save-status saved';
  }
}

function showModal(title, text, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-text').textContent = text;
  document.getElementById('modal').classList.add('show');
  modalCallback = onConfirm;
}

function hideModal() {
  document.getElementById('modal').classList.remove('show');
  modalCallback = null;
}

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function switchPanel(panelId) {
  collectData();
  activePanel = panelId;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === panelId);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + panelId);
  });
  const meta = PANEL_META[panelId] || {
    title: contentData.countries.find(c => c.id === panelId)?.title || 'Ölkə',
    desc: 'Paketlər, linklər və əlaqə məlumatları',
    breadcrumb: 'Ölkələr',
    icon: 'globe'
  };
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-desc').textContent = meta.desc;
  document.getElementById('breadcrumb').textContent = meta.breadcrumb;
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  let html = '<div class="nav-label">Ümumi</div>';
  html += `<button class="nav-item${activePanel === 'hero' ? ' active' : ''}" data-panel="hero" onclick="switchPanel('hero')">${ICONS.home} Başlıq və təsvir</button>`;
  html += `<button class="nav-item${activePanel === 'footer' ? ' active' : ''}" data-panel="footer" onclick="switchPanel('footer')">${ICONS.footer} Footer</button>`;
  html += '<div class="nav-label">Ölkələr</div>';
  contentData.countries.forEach(c => {
    const badge = c.packages.length ? `<span class="nav-badge">${c.packages.length}</span>` : '';
    html += `<button class="nav-item${activePanel === c.id ? ' active' : ''}" data-panel="${c.id}" data-search="${esc(c.title.toLowerCase())}" onclick="switchPanel('${c.id}')">${ICONS.globe} ${esc(c.title)}${badge}</button>`;
  });
  nav.innerHTML = html;
}

function renderHeroPanel() {
  const h = contentData.hero;
  return `
    <div id="panel-hero" class="panel${activePanel === 'hero' ? ' active' : ''}">
      <div class="card">
        <div class="card-head">
          <div class="card-icon purple">${ICONS.home}</div>
          <div>
            <h2>Sayt Başlığı</h2>
            <p>Əsas səhifənin yuxarı hissəsində görünən mətnlər</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field full">
              <label>${ICONS.text} Başlıq</label>
              <input data-hero="title" value="${esc(h.title)}">
            </div>
            <div class="form-field full">
              <label>${ICONS.text} Alt başlıq</label>
              <input data-hero="subtitle" value="${esc(h.subtitle)}">
            </div>
            <div class="form-field">
              <label>${ICONS.text} 1-ci təsvir</label>
              <input data-hero="desc1" value="${esc(h.desc1)}">
              <div class="hint">Ölkə sayı və əsas mesaj</div>
            </div>
            <div class="form-field">
              <label>${ICONS.text} 2-ci təsvir</label>
              <input data-hero="desc2" value="${esc(h.desc2)}">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFooterPanel() {
  return `
    <div id="panel-footer" class="panel${activePanel === 'footer' ? ' active' : ''}">
      <div class="card">
        <div class="card-head">
          <div class="card-icon amber">${ICONS.footer}</div>
          <div>
            <h2>Footer Mətni</h2>
            <p>Səhifənin ən altında görünən yazı</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-field">
            <label>${ICONS.text} Credit mətni</label>
            <input id="credit-input" value="${esc(contentData.credit)}">
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInfoBlock(info, countryIdx) {
  if (!info.length) return '';
  let html = '';
  info.forEach((line, li) => {
    if (line.type === 'text') {
      html += `
        <div class="info-card" data-info="${li}">
          <div class="info-card-head">
            <span class="info-tag text">Mətn bloku</span>
            <button class="btn btn-icon" onclick="removeInfoLine(${countryIdx},${li})" title="Sil">${ICONS.trash}</button>
          </div>
          <div class="form-field">
            <label>Mətn</label>
            <textarea data-info-text>${esc(line.content)}</textarea>
          </div>
        </div>
      `;
    } else if (line.type === 'rich') {
      const link = line.parts.find(p => p.type === 'link') || { text: '', href: '' };
      const before = line.parts.find(p => p.type === 'text' && line.parts.indexOf(p) === 0);
      const after = line.parts.filter(p => p.type === 'text').pop();
      html += `
        <div class="info-card" data-info="${li}">
          <div class="info-card-head">
            <span class="info-tag link">Göy link bloku</span>
            <button class="btn btn-icon" onclick="removeInfoLine(${countryIdx},${li})" title="Sil">${ICONS.trash}</button>
          </div>
          <div class="form-field">
            <label>Linkdən əvvəl</label>
            <input data-info-before value="${esc(before ? before.value : '')}">
          </div>
          <div class="form-grid" style="margin-top:16px">
            <div class="form-field">
              <label>${ICONS.link} Link mətni</label>
              <input data-info-link-text value="${esc(link.text)}">
            </div>
            <div class="form-field">
              <label>${ICONS.file} PDF fayl</label>
              <input data-info-link-href value="${esc(link.href)}">
            </div>
          </div>
          <div class="form-field" style="margin-top:16px">
            <label>Linkdən sonra</label>
            <input data-info-after value="${esc(after && after !== before ? after.value : '')}">
          </div>
          <div class="link-preview-box">
            <strong>Önizləmə:</strong> ${esc(before ? before.value : '')}<strong style="color:#2563eb"> ${esc(link.text)}</strong>${esc(after && after !== before ? after.value : '')}
          </div>
        </div>
      `;
    }
  });
  return html;
}

function renderPackageCard(pkg, countryIdx, pi) {
  return `
    <div class="package-card package-item" data-country="${countryIdx}" data-pkg="${pi}">
      <div class="package-card-header">
        <div class="package-num">${pi + 1}</div>
        <div class="package-card-actions">
          <label class="btn btn-upload" style="cursor:pointer">
            ${ICONS.file} PDF seç
            <input type="file" accept=".pdf" hidden data-pkg-upload>
          </label>
          <button class="btn btn-icon" onclick="removePackage(${countryIdx},${pi})" title="Paketi sil">${ICONS.trash}</button>
        </div>
      </div>
      <div class="form-field">
        <label>${ICONS.link} Paket adı (saytda göy link)</label>
        <input data-pkg-title value="${esc(pkg.title)}" placeholder="Məs: Summer Package 2026">
      </div>
      <div class="form-grid" style="margin-top:16px">
        <div class="form-field">
          <label>${ICONS.file} PDF fayl yolu</label>
          <div class="pdf-field">
            <input data-pkg-pdf value="${esc(pkg.pdf)}" placeholder="pdfs/fayl-adi.pdf">
          </div>
        </div>
        <div class="form-field">
          <label>Validity (tarix)</label>
          <input data-pkg-validity value="${esc(pkg.validity)}" placeholder="01.06.2026-30.08.2026 Validity">
        </div>
      </div>
    </div>
  `;
}

function renderPackagesGrid(country, countryIdx) {
  if (!country.packages.length) {
    return `
      <div class="empty-state">
        ${ICONS.package}
        <p>Hələ paket yoxdur.<br>Aşağıdakı düymə ilə əlavə edin.</p>
      </div>
    `;
  }
  return `<div class="packages-grid">${country.packages.map((p, i) => renderPackageCard(p, countryIdx, i)).join('')}</div>`;
}

function renderCountryPanel(country, idx) {
  return `
    <div id="panel-${country.id}" class="panel${activePanel === country.id ? ' active' : ''}" data-section-country="${idx}">
      <div class="card">
        <div class="card-head">
          <div class="card-icon blue">${ICONS.globe}</div>
          <div>
            <h2>Ölkə Məlumatı</h2>
            <p>Başlıq və əlaqə məlumatları</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field">
              <label>${ICONS.text} Ölkə başlığı</label>
              <input data-country-title value="${esc(country.title)}">
            </div>
            <div class="form-field">
              <label>${ICONS.contact} Email</label>
              <input data-country-email value="${esc(country.email)}">
            </div>
            <div class="form-field full">
              <label>${ICONS.contact} Əlaqə mətni</label>
              <input data-country-contact value="${esc(country.contact)}">
              <div class="hint">Telefon nömrələri — "email:" sözünə qədər</div>
            </div>
          </div>
        </div>
      </div>

      ${country.info.length ? `
      <div class="card">
        <div class="card-head">
          <div class="card-icon purple">${ICONS.link}</div>
          <div>
            <h2>Info Blokları</h2>
            <p>Əlavə məlumat və linklər</p>
          </div>
        </div>
        <div class="card-body">${renderInfoBlock(country.info, idx)}</div>
      </div>` : ''}

      <div class="card">
        <div class="card-head">
          <div class="card-icon green">${ICONS.package}</div>
          <div>
            <h2>Tur Paketləri <span style="color:var(--text-muted);font-weight:500">(${country.packages.length})</span></h2>
            <p>Hər paket saytda göy link kimi görünür</p>
          </div>
        </div>
        <div class="card-body">
          ${renderPackagesGrid(country, idx)}
          <button class="btn btn-add" style="margin-top:16px" onclick="addPackage(${idx})">
            ${ICONS.plus} Yeni paket əlavə et
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEditor() {
  const container = document.getElementById('editor');
  let html = renderHeroPanel() + renderFooterPanel();
  contentData.countries.forEach((c, i) => { html += renderCountryPanel(c, i); });
  container.innerHTML = html;
  bindUploadHandlers();
  bindInputListeners();
  switchPanel(activePanel);
}

function bindInputListeners() {
  document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => setDirty(true));
  });
}

function bindUploadHandlers() {
  document.querySelectorAll('[data-pkg-upload]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const card = e.target.closest('.package-item');
      const cIdx = +card.dataset.country;
      const pIdx = +card.dataset.pkg;
      const fileName = file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
      const path = 'pdfs/' + fileName;
      contentData.countries[cIdx].packages[pIdx].pdf = path;
      card.querySelector('[data-pkg-pdf]').value = path;
      setDirty(true);
      showToast('PDF yolu yeniləndi', 'success');
      e.target.value = '';
    });
  });
}

function collectData() {
  document.querySelectorAll('[data-hero]').forEach(el => {
    contentData.hero[el.dataset.hero] = el.value;
  });
  const creditEl = document.getElementById('credit-input');
  if (creditEl) contentData.credit = creditEl.value;

  document.querySelectorAll('[data-section-country]').forEach(section => {
    const idx = +section.dataset.sectionCountry;
    const country = contentData.countries[idx];
    const titleEl = section.querySelector('[data-country-title]');
    const contactEl = section.querySelector('[data-country-contact]');
    const emailEl = section.querySelector('[data-country-email]');
    if (titleEl) country.title = titleEl.value;
    if (contactEl) country.contact = contactEl.value;
    if (emailEl) country.email = emailEl.value;

    section.querySelectorAll('[data-info-text]').forEach(el => {
      const li = +el.closest('[data-info]').dataset.info;
      country.info[li].content = el.value;
    });

    section.querySelectorAll('[data-info-link-text]').forEach(el => {
      const item = el.closest('[data-info]');
      const li = +item.dataset.info;
      country.info[li].parts = [
        { type: 'text', value: item.querySelector('[data-info-before]').value },
        { type: 'link', text: el.value, href: item.querySelector('[data-info-link-href]').value },
        { type: 'text', value: item.querySelector('[data-info-after]').value }
      ];
    });

    section.querySelectorAll('.package-item').forEach(item => {
      const pi = +item.dataset.pkg;
      country.packages[pi].title = item.querySelector('[data-pkg-title]').value;
      country.packages[pi].pdf = item.querySelector('[data-pkg-pdf]').value;
      country.packages[pi].validity = item.querySelector('[data-pkg-validity]').value;
    });
  });
}

function addPackage(countryIdx) {
  collectData();
  contentData.countries[countryIdx].packages.push({
    id: uid(), title: 'Yeni paket', pdf: 'pdfs/yeni-paket.pdf', validity: '01.01.2026-31.12.2026 Validity'
  });
  const panel = contentData.countries[countryIdx].id;
  setDirty(true);
  renderEditor();
  switchPanel(panel);
  showToast('Yeni paket əlavə edildi', 'success');
}

function removePackage(countryIdx, pkgIdx) {
  showModal('Paketi sil', 'Bu paket tamamilə silinəcək. Davam etmək istəyirsiniz?', () => {
    collectData();
    const panel = contentData.countries[countryIdx].id;
    contentData.countries[countryIdx].packages.splice(pkgIdx, 1);
    setDirty(true);
    renderEditor();
    switchPanel(panel);
    showToast('Paket silindi', 'success');
  });
}

function removeInfoLine(countryIdx, li) {
  showModal('Bloku sil', 'Bu info bloku silinəcək. Davam?', () => {
    collectData();
    const panel = contentData.countries[countryIdx].id;
    contentData.countries[countryIdx].info.splice(li, 1);
    setDirty(true);
    renderEditor();
    switchPanel(panel);
    showToast('Blok silindi', 'success');
  });
}

function handleSave() {
  collectData();
  saveContent(contentData);
  renderSidebar();
  setDirty(false);
  showToast('Dəyişikliklər yadda saxlanıldı', 'success');
}

function handleExport() {
  collectData();
  saveContent(contentData);
  exportContent(contentData);
  showToast('content.json yükləndi', 'success');
}

function handlePreview() {
  collectData();
  saveContent(contentData);
  window.open('../index.html', '_blank');
}

function handleLogout() {
  destroySession();
  location.reload();
}

function handleReset() {
  showModal('Sıfırla', 'Bütün dəyişikliklər silinəcək və orijinal məzmun bərpa olunacaq.', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function filterNav(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.nav-item[data-search]').forEach(item => {
    item.classList.toggle('hidden', q && !item.dataset.search.includes(q));
  });
}

async function initAdmin() {
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    if (modalCallback) modalCallback();
    hideModal();
  });
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') hideModal();
  });

  contentData = await loadContent();

  if (!isAuthenticated()) {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('admin-panel').classList.remove('active');
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = await attemptLogin(
        document.getElementById('username').value.trim(),
        document.getElementById('password').value
      );
      const errEl = document.getElementById('login-error');
      if (result.ok) location.reload();
      else if (result.locked) errEl.textContent = `Bloklandı. ${result.remaining}s gözləyin.`;
      else errEl.textContent = `Yanlış giriş. ${result.attemptsLeft} cəhd qaldı.`;
    });
    return;
  }

  document.getElementById('login-view').style.display = 'none';
  document.getElementById('admin-panel').classList.add('active');
  renderSidebar();
  renderEditor();
  setDirty(false);

  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('export-btn').addEventListener('click', handleExport);
  document.getElementById('preview-btn').addEventListener('click', handlePreview);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('reset-btn').addEventListener('click', handleReset);
  document.getElementById('nav-search').addEventListener('input', (e) => filterNav(e.target.value));

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  });
}

document.addEventListener('DOMContentLoaded', initAdmin);

window.switchPanel = switchPanel;
window.addPackage = addPackage;
window.removePackage = removePackage;
window.removeInfoLine = removeInfoLine;
