let contentData = null;
let activePanel = 'hero';

const PANEL_TITLES = {
  hero: { title: 'Ümumi məlumat', desc: 'Saytın əsas başlıqları və təsvirləri' },
  footer: { title: 'Footer', desc: 'Səhifənin alt hissəsi' }
};

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
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
  const info = PANEL_TITLES[panelId] || {
    title: contentData.countries.find(c => c.id === panelId)?.title || 'Ölkə',
    desc: 'Paketləri, linkləri və əlaqə məlumatlarını redaktə edin'
  };
  document.getElementById('page-title').textContent = info.title;
  document.getElementById('page-desc').textContent = info.desc;
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  let html = '<div class="nav-group-title">Ümumi</div>';
  html += '<button class="nav-item active" data-panel="hero" onclick="switchPanel(\'hero\')">Başlıq və təsvir</button>';
  html += '<button class="nav-item" data-panel="footer" onclick="switchPanel(\'footer\')">Footer</button>';
  html += '<div class="nav-group-title">Ölkələr</div>';
  contentData.countries.forEach(c => {
    html += `<button class="nav-item" data-panel="${c.id}" onclick="switchPanel('${c.id}')">${esc(c.title)}</button>`;
  });
  nav.innerHTML = html;
}

function renderHeroPanel() {
  const h = contentData.hero;
  return `
    <div id="panel-hero" class="panel active">
      <div class="card">
        <div class="card-header">
          <h2>Sayt başlığı</h2>
          <p>Əsas səhifənin yuxarı hissəsində görünən mətnlər</p>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field full">
              <label>Başlıq</label>
              <input data-hero="title" value="${esc(h.title)}">
            </div>
            <div class="form-field full">
              <label>Alt başlıq</label>
              <input data-hero="subtitle" value="${esc(h.subtitle)}">
            </div>
            <div class="form-field">
              <label>1-ci təsvir sətri</label>
              <input data-hero="desc1" value="${esc(h.desc1)}">
              <div class="hint">Məs: "New ready sample Tour Packages from 10 countries"</div>
            </div>
            <div class="form-field">
              <label>2-ci təsvir sətri</label>
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
    <div id="panel-footer" class="panel">
      <div class="card">
        <div class="card-header">
          <h2>Footer mətni</h2>
          <p>Səhifənin ən altında görünən yazı</p>
        </div>
        <div class="card-body">
          <div class="form-field">
            <label>Credit mətni</label>
            <input id="credit-input" value="${esc(contentData.credit)}">
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInfoBlock(info, countryIdx) {
  if (!info.length) return '<p class="empty-msg">Bu ölkə üçün info bloku yoxdur</p>';
  let html = '';
  info.forEach((line, li) => {
    if (line.type === 'text') {
      html += `
        <div class="info-block-edit" data-country="${countryIdx}" data-info="${li}">
          <div class="block-title">Mətn bloku #${li + 1}</div>
          <div class="form-field">
            <label>Mətn</label>
            <textarea data-info-text>${esc(line.content)}</textarea>
          </div>
          <button class="btn btn-red btn-xs" onclick="removeInfoLine(${countryIdx},${li})">Bu bloku sil</button>
        </div>
      `;
    } else if (line.type === 'rich') {
      const link = line.parts.find(p => p.type === 'link') || { text: '', href: '' };
      const before = line.parts.find(p => p.type === 'text' && line.parts.indexOf(p) === 0);
      const after = line.parts.filter(p => p.type === 'text').pop();
      html += `
        <div class="info-block-edit" data-country="${countryIdx}" data-info="${li}">
          <div class="block-title">Link bloku #${li + 1} (mavi link)</div>
          <div class="form-field">
            <label>Linkdən əvvəlki mətn</label>
            <input data-info-before value="${esc(before ? before.value : '')}">
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label>Link mətni (saytda göy rəngdə)</label>
              <input data-info-link-text value="${esc(link.text)}">
            </div>
            <div class="form-field">
              <label>PDF fayl yolu</label>
              <input data-info-link-href value="${esc(link.href)}">
              <div class="hint">Məs: pdfs/fayl-adi.pdf</div>
            </div>
          </div>
          <div class="form-field">
            <label>Linkdən sonrakı mətn</label>
            <input data-info-after value="${esc(after && after !== before ? after.value : '')}">
          </div>
          <button class="btn btn-red btn-xs" onclick="removeInfoLine(${countryIdx},${li})">Bu bloku sil</button>
        </div>
      `;
    }
  });
  return html;
}

function renderPackagesTable(country, countryIdx) {
  if (!country.packages.length) {
    return '<p class="empty-msg">Hələ paket yoxdur. Aşağıdan əlavə edin.</p>';
  }
  let rows = '';
  country.packages.forEach((pkg, pi) => {
    rows += `
      <tr class="package-item" data-country="${countryIdx}" data-pkg="${pi}">
        <td>${pi + 1}</td>
        <td><input data-pkg-title value="${esc(pkg.title)}" placeholder="Paket adı"></td>
        <td><input data-pkg-pdf value="${esc(pkg.pdf)}" placeholder="pdfs/fayl.pdf"></td>
        <td><input data-pkg-validity value="${esc(pkg.validity)}" placeholder="Tarix aralığı"></td>
        <td>
          <div class="table-actions">
            <label class="btn btn-outline btn-xs" style="cursor:pointer">
              PDF seç
              <input type="file" accept=".pdf" hidden data-pkg-upload>
            </label>
            <button class="btn btn-red btn-xs" onclick="removePackage(${countryIdx},${pi})">Sil</button>
          </div>
        </td>
      </tr>
    `;
  });
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Paket adı (link mətni)</th>
          <th>PDF fayl</th>
          <th>Validity (tarix)</th>
          <th style="width:160px">Əməliyyat</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderCountryPanel(country, idx) {
  return `
    <div id="panel-${country.id}" class="panel" data-section-country="${idx}">
      <div class="card">
        <div class="card-header">
          <h2>Ölkə məlumatı</h2>
          <p>Bölmənin başlığı və əlaqə məlumatları</p>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field">
              <label>Ölkə başlığı</label>
              <input data-country-title value="${esc(country.title)}">
            </div>
            <div class="form-field">
              <label>Email</label>
              <input data-country-email value="${esc(country.email)}">
            </div>
            <div class="form-field full">
              <label>Əlaqə mətni</label>
              <input data-country-contact value="${esc(country.contact)}">
              <div class="hint">Telefon nömrələri və "email:" hissəsi</div>
            </div>
          </div>
        </div>
      </div>

      ${country.info.length ? `
      <div class="card">
        <div class="card-header">
          <h2>Info blokları</h2>
          <p>Ölkə haqqında əlavə məlumat və linklər</p>
        </div>
        <div class="card-body">${renderInfoBlock(country.info, idx)}</div>
      </div>` : ''}

      <div class="card">
        <div class="card-header">
          <h2>Tur paketləri</h2>
          <p>Hər sətir bir paketdir — adı göy link, PDF fayla yönləndirir</p>
        </div>
        <div class="card-body">
          ${renderPackagesTable(country, idx)}
          <div class="add-row">
            <button class="btn btn-blue btn-xs" onclick="addPackage(${idx})">+ Yeni paket əlavə et</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEditor() {
  const container = document.getElementById('editor');
  let html = renderHeroPanel();
  html += renderFooterPanel();
  contentData.countries.forEach((c, i) => { html += renderCountryPanel(c, i); });
  container.innerHTML = html;
  bindUploadHandlers();
  switchPanel(activePanel);
}

function bindUploadHandlers() {
  document.querySelectorAll('[data-pkg-upload]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const row = e.target.closest('.package-item');
      const cIdx = +row.dataset.country;
      const pIdx = +row.dataset.pkg;
      const fileName = file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
      const path = 'pdfs/' + fileName;
      contentData.countries[cIdx].packages[pIdx].pdf = path;
      row.querySelector('[data-pkg-pdf]').value = path;
      showToast('PDF yolu yeniləndi: ' + fileName);
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
      const infoItem = el.closest('[data-info]');
      const li = +infoItem.dataset.info;
      country.info[li].content = el.value;
    });

    section.querySelectorAll('[data-info-link-text]').forEach(el => {
      const infoItem = el.closest('[data-info]');
      const li = +infoItem.dataset.info;
      country.info[li].parts = [
        { type: 'text', value: infoItem.querySelector('[data-info-before]').value },
        { type: 'link', text: el.value, href: infoItem.querySelector('[data-info-link-href]').value },
        { type: 'text', value: infoItem.querySelector('[data-info-after]').value }
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
    id: uid(),
    title: 'Yeni paket',
    pdf: 'pdfs/yeni-paket.pdf',
    validity: '01.01.2026-31.12.2026 Validity'
  });
  const panel = contentData.countries[countryIdx].id;
  renderEditor();
  switchPanel(panel);
}

function removePackage(countryIdx, pkgIdx) {
  if (!confirm('Bu paketi silmək istəyirsiniz?')) return;
  collectData();
  const panel = contentData.countries[countryIdx].id;
  contentData.countries[countryIdx].packages.splice(pkgIdx, 1);
  renderEditor();
  switchPanel(panel);
}

function removeInfoLine(countryIdx, li) {
  if (!confirm('Bu bloku silmək istəyirsiniz?')) return;
  collectData();
  const panel = contentData.countries[countryIdx].id;
  contentData.countries[countryIdx].info.splice(li, 1);
  renderEditor();
  switchPanel(panel);
}

function handleSave() {
  collectData();
  saveContent(contentData);
  renderSidebar();
  showToast('Dəyişikliklər yadda saxlanıldı');
}

function handleExport() {
  collectData();
  saveContent(contentData);
  exportContent(contentData);
  showToast('content.json yükləndi');
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
  if (!confirm('Bütün dəyişikliklər silinəcək. Davam?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

async function initAdmin() {
  contentData = await loadContent();

  if (!isAuthenticated()) {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value;
      const errEl = document.getElementById('login-error');
      const result = await attemptLogin(user, pass);

      if (result.ok) {
        location.reload();
      } else if (result.locked) {
        errEl.textContent = `Çox cəhd. ${result.remaining} saniyə gözləyin.`;
      } else {
        errEl.textContent = `Yanlış giriş. ${result.attemptsLeft} cəhd qaldı.`;
      }
    });
    return;
  }

  document.getElementById('login-view').style.display = 'none';
  document.getElementById('admin-panel').classList.add('active');
  renderSidebar();
  renderEditor();

  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('export-btn').addEventListener('click', handleExport);
  document.getElementById('preview-btn').addEventListener('click', handlePreview);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('reset-btn').addEventListener('click', handleReset);
}

document.addEventListener('DOMContentLoaded', initAdmin);

window.switchPanel = switchPanel;
window.addPackage = addPackage;
window.removePackage = removePackage;
window.removeInfoLine = removeInfoLine;
