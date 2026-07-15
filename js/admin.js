let contentData = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function renderHeroEditor() {
  const h = contentData.hero;
  return `
    <div class="edit-section">
      <h2>Hero</h2>
      <div class="field"><label>Başlıq</label><input data-hero="title" value="${esc(h.title)}"></div>
      <div class="field"><label>Alt başlıq</label><input data-hero="subtitle" value="${esc(h.subtitle)}"></div>
      <div class="field"><label>Təsvir 1</label><input data-hero="desc1" value="${esc(h.desc1)}"></div>
      <div class="field"><label>Təsvir 2</label><input data-hero="desc2" value="${esc(h.desc2)}"></div>
    </div>
  `;
}

function renderInfoEditor(info, countryIdx) {
  if (!info.length) return '';
  let html = '<h3>Info blok</h3>';
  info.forEach((line, li) => {
    if (line.type === 'text') {
      html += `
        <div class="info-line-item" data-country="${countryIdx}" data-info="${li}">
          <div class="field"><label>Mətn</label><textarea data-info-text>${esc(line.content)}</textarea></div>
          <button class="btn btn-danger btn-sm" onclick="removeInfoLine(${countryIdx},${li})">Sil</button>
        </div>
      `;
    } else if (line.type === 'rich') {
      const link = line.parts.find(p => p.type === 'link') || { text: '', href: '' };
      const before = line.parts.find(p => p.type === 'text' && line.parts.indexOf(p) === 0);
      const after = line.parts.filter(p => p.type === 'text').pop();
      html += `
        <div class="info-line-item" data-country="${countryIdx}" data-info="${li}">
          <div class="field"><label>Mətn (əvvəl)</label><input data-info-before value="${esc(before ? before.value : '')}"></div>
          <div class="link-fields">
            <div class="field"><label>Link mətni</label><input data-info-link-text value="${esc(link.text)}"></div>
            <div class="field"><label>PDF yolu</label><input data-info-link-href value="${esc(link.href)}"></div>
          </div>
          <div class="field"><label>Mətn (sonra)</label><input data-info-after value="${esc(after && after !== before ? after.value : '')}"></div>
          <button class="btn btn-danger btn-sm" onclick="removeInfoLine(${countryIdx},${li})">Sil</button>
        </div>
      `;
    }
  });
  return html;
}

function renderPackageEditor(pkg, countryIdx, pkgIdx) {
  return `
    <div class="package-item" data-country="${countryIdx}" data-pkg="${pkgIdx}">
      <div class="field"><label>Paket adı (link mətni)</label><input data-pkg-title value="${esc(pkg.title)}"></div>
      <div class="field-row">
        <div class="field"><label>PDF yolu</label><input data-pkg-pdf value="${esc(pkg.pdf)}"></div>
        <div class="field"><label>Validity</label><input data-pkg-validity value="${esc(pkg.validity)}"></div>
      </div>
      <div class="package-actions">
        <label class="btn btn-secondary btn-sm" style="cursor:pointer">
          PDF dəyiş
          <input type="file" accept=".pdf" hidden data-pkg-upload>
        </label>
        <button class="btn btn-danger btn-sm" onclick="removePackage(${countryIdx},${pkgIdx})">Sil</button>
      </div>
    </div>
  `;
}

function renderCountryEditor(country, idx) {
  let packagesHtml = '';
  if (country.packages.length) {
    packagesHtml = '<h3>Paketlər</h3>';
    country.packages.forEach((pkg, pi) => {
      packagesHtml += renderPackageEditor(pkg, idx, pi);
    });
  }
  packagesHtml += `
    <div class="add-btn-wrap">
      <button class="btn btn-secondary btn-sm" onclick="addPackage(${idx})">+ Paket əlavə et</button>
    </div>
  `;

  return `
    <div class="edit-section" data-section-country="${idx}">
      <h2>${esc(country.title)}</h2>
      <div class="field"><label>Ölkə başlığı</label><input data-country-title value="${esc(country.title)}"></div>
      ${renderInfoEditor(country.info, idx)}
      ${packagesHtml}
      <h3>Əlaqə</h3>
      <div class="field"><label>Əlaqə mətni</label><input data-country-contact value="${esc(country.contact)}"></div>
      <div class="field"><label>Email</label><input data-country-email value="${esc(country.email)}"></div>
    </div>
  `;
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderEditor() {
  const container = document.getElementById('editor');
  let html = renderHeroEditor();
  contentData.countries.forEach((c, i) => { html += renderCountryEditor(c, i); });
  html += `
    <div class="edit-section">
      <h2>Footer</h2>
      <div class="field"><label>Credit mətni</label><input id="credit-input" value="${esc(contentData.credit)}"></div>
    </div>
  `;
  container.innerHTML = html;
  bindUploadHandlers();
}

function bindUploadHandlers() {
  document.querySelectorAll('[data-pkg-upload]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const item = e.target.closest('.package-item');
      const cIdx = +item.dataset.country;
      const pIdx = +item.dataset.pkg;
      const fileName = file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
      const path = 'pdfs/' + fileName;
      contentData.countries[cIdx].packages[pIdx].pdf = path;
      item.querySelector('[data-pkg-pdf]').value = path;
      showToast('PDF yolu yeniləndi: ' + fileName);
      e.target.value = '';
    });
  });
}

function collectData() {
  document.querySelectorAll('[data-hero]').forEach(el => {
    contentData.hero[el.dataset.hero] = el.value;
  });

  document.getElementById('credit-input').value && (contentData.credit = document.getElementById('credit-input').value);

  document.querySelectorAll('[data-section-country]').forEach(section => {
    const idx = +section.dataset.sectionCountry;
    const country = contentData.countries[idx];
    country.title = section.querySelector('[data-country-title]').value;
    country.contact = section.querySelector('[data-country-contact]').value;
    country.email = section.querySelector('[data-country-email]').value;

    section.querySelectorAll('[data-info-text]').forEach(el => {
      const infoItem = el.closest('[data-info]');
      const li = +infoItem.dataset.info;
      country.info[li].content = el.value;
    });

    section.querySelectorAll('[data-info-link-text]').forEach(el => {
      const infoItem = el.closest('[data-info]');
      const li = +infoItem.dataset.info;
      const before = infoItem.querySelector('[data-info-before]').value;
      const after = infoItem.querySelector('[data-info-after]').value;
      const text = el.value;
      const href = infoItem.querySelector('[data-info-link-href]').value;
      country.info[li].parts = [
        { type: 'text', value: before },
        { type: 'link', text, href },
        { type: 'text', value: after }
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
  renderEditor();
}

function removePackage(countryIdx, pkgIdx) {
  if (!confirm('Bu paketi silmək istəyirsiniz?')) return;
  collectData();
  contentData.countries[countryIdx].packages.splice(pkgIdx, 1);
  renderEditor();
}

function removeInfoLine(countryIdx, li) {
  if (!confirm('Bu sətri silmək istəyirsiniz?')) return;
  collectData();
  contentData.countries[countryIdx].info.splice(li, 1);
  renderEditor();
}

function handleSave() {
  collectData();
  saveContent(contentData);
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
  document.getElementById('admin-panel').style.display = 'block';
  renderEditor();

  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('export-btn').addEventListener('click', handleExport);
  document.getElementById('preview-btn').addEventListener('click', handlePreview);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('reset-btn').addEventListener('click', handleReset);
}

document.addEventListener('DOMContentLoaded', initAdmin);

window.addPackage = addPackage;
window.removePackage = removePackage;
window.removeInfoLine = removeInfoLine;
