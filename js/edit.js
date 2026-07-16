let editData = null;
let activeLinkAnchor = null;
let activePhoneAnchor = null;
let activeEmailAnchor = null;
let selectedRange = null;

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || uid();
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
    return { type: 'text', content: parts[0].value.trim() };
  }
  return { type: 'rich', parts };
}

function collectFromDOM() {
  const data = {
    hero: {
      title: document.querySelector('.ed-hero-title')?.textContent.trim() || '',
      subtitle: document.querySelector('.ed-hero-sub')?.textContent.trim() || '',
      desc1: document.querySelector('.ed-hero-desc1')?.textContent.trim() || '',
      desc2: document.querySelector('.ed-hero-desc2')?.textContent.trim() || ''
    },
    credit: document.querySelector('.ed-credit')?.textContent.trim() || '',
    countries: []
  };

  document.querySelectorAll('.country-section').forEach(section => {
    const country = {
      id: section.id || slugify(section.querySelector('h2')?.textContent || 'country'),
      title: section.querySelector('h2')?.textContent.trim() || '',
      info: [],
      packages: [],
      contactPrefix: section.querySelector('.contact-prefix')?.textContent.trim() || 'for more information please contact ',
      phones: [],
      email: section.querySelector('.contact-email')?.textContent.trim() || 'info@zakher.travel'
    };

    section.querySelectorAll('.phone-link').forEach(a => {
      country.phones.push({
        number: a.textContent.trim(),
        whatsapp: a.dataset.whatsapp || digitsOnly(a.textContent)
      });
    });

    section.querySelectorAll('.info-line-wrap p').forEach(p => {
      if (p.dataset.rich) country.info.push(parseRichParagraph(p));
      else country.info.push({ type: 'text', content: p.textContent.trim() });
    });

    section.querySelectorAll('.packages li').forEach((li, pi) => {
      const a = li.querySelector('a.pdf-link');
      const validity = li.querySelector('.validity');
      const old = editData?.countries?.find(c => c.id === section.id);
      const oldPkg = old?.packages?.[pi];
      country.packages.push({
        id: oldPkg?.id || uid(),
        title: a?.textContent.trim() || '',
        pdf: a?.dataset.pdf || a?.getAttribute('href') || '',
        validity: validity?.textContent.trim() || ''
      });
    });

    data.countries.push(country);
  });

  const count = data.countries.length;
  if (data.hero.desc1.match(/\d+\s*countr/i)) {
    data.hero.desc1 = data.hero.desc1.replace(/\d+/, count);
  }

  return data;
}

async function saveAndRefresh(msg) {
  editData = collectFromDOM();
  saveContent(editData);
  await renderPage(editData, document.getElementById('app'));
  initEditModeUI();
  if (msg) showToast(msg);
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

function createToolbar() {
  if (document.getElementById('edit-toolbar')) return;
  const bar = document.createElement('div');
  bar.id = 'edit-toolbar';
  bar.innerHTML = `
    <span class="edit-badge">✎ Redaktə rejimi</span>
    <span class="edit-hint">Mətnə kliklə · Telefon/Emailə kliklə → redaktə · Söz seç → Link et</span>
    <div class="edit-actions">
      <button type="button" id="btn-add-link" class="et-btn" disabled>Link et</button>
      <button type="button" id="btn-save" class="et-btn et-save">Yadda saxla</button>
      <button type="button" id="btn-export" class="et-btn">Export</button>
      <button type="button" id="btn-exit" class="et-btn et-exit">Çıxış</button>
    </div>
  `;
  document.body.appendChild(bar);
}

function createModals() {
  if (!document.getElementById('link-modal')) {
    const linkM = document.createElement('div');
    linkM.id = 'link-modal';
    linkM.className = 'edit-modal';
    linkM.innerHTML = `
      <div class="edit-modal-box">
        <h3>PDF Link yarat</h3>
        <p class="modal-selected" id="modal-selected-text"></p>
        <label>PDF yüklə</label>
        <input type="file" id="modal-pdf-file" accept=".pdf">
        <p class="modal-or">və ya mövcud yol:</p>
        <input type="text" id="modal-pdf-path" placeholder="pdfs/fayl-adi.pdf">
        <div class="modal-btns">
          <button type="button" id="modal-cancel" class="et-btn et-dark">Ləğv</button>
          <button type="button" id="modal-confirm" class="et-btn et-save">Link yarat</button>
        </div>
      </div>`;
    document.body.appendChild(linkM);
  }

  if (!document.getElementById('pdf-modal')) {
    const pdfM = document.createElement('div');
    pdfM.id = 'pdf-modal';
    pdfM.className = 'edit-modal';
    pdfM.innerHTML = `
      <div class="edit-modal-box">
        <h3>PDF dəyiş / yüklə</h3>
        <p id="pdf-modal-title" class="modal-selected"></p>
        <label>PDF yüklə</label>
        <input type="file" id="pdf-modal-file" accept=".pdf">
        <p class="modal-or">və ya yol:</p>
        <input type="text" id="pdf-modal-path" placeholder="pdfs/fayl-adi.pdf">
        <div class="modal-btns">
          <button type="button" id="pdf-modal-cancel" class="et-btn et-dark">Ləğv</button>
          <button type="button" id="pdf-modal-confirm" class="et-btn et-save">Tətbiq et</button>
        </div>
      </div>`;
    document.body.appendChild(pdfM);
  }

  if (!document.getElementById('phone-modal')) {
    const phoneM = document.createElement('div');
    phoneM.id = 'phone-modal';
    phoneM.className = 'edit-modal';
    phoneM.innerHTML = `
      <div class="edit-modal-box">
        <h3>Telefon / WhatsApp</h3>
        <label>Telefon nömrəsi (görünən)</label>
        <input type="text" id="phone-modal-number" placeholder="+994 70 449 72 00">
        <label>WhatsApp linki</label>
        <input type="text" id="phone-modal-wa" placeholder="https://wa.me/994704497200">
        <p class="modal-hint">Nömrə yazanda WhatsApp linki avtomatik yaranır. İstəsən dəyişə bilərsən.</p>
        <div class="modal-btns">
          <button type="button" id="phone-modal-delete" class="et-btn et-exit">Sil</button>
          <button type="button" id="phone-modal-cancel" class="et-btn et-dark">Ləğv</button>
          <button type="button" id="phone-modal-confirm" class="et-btn et-save">Yadda saxla</button>
        </div>
      </div>`;
    document.body.appendChild(phoneM);
  }

  if (!document.getElementById('email-modal')) {
    const emailM = document.createElement('div');
    emailM.id = 'email-modal';
    emailM.className = 'edit-modal';
    emailM.innerHTML = `
      <div class="edit-modal-box">
        <h3>Email redaktə</h3>
        <label>Email ünvanı</label>
        <input type="email" id="email-modal-input" placeholder="info@zakher.travel">
        <div class="modal-btns">
          <button type="button" id="email-modal-cancel" class="et-btn et-dark">Ləğv</button>
          <button type="button" id="email-modal-confirm" class="et-btn et-save">Yadda saxla</button>
        </div>
      </div>`;
    document.body.appendChild(emailM);
  }
}

function getSelectionInEditable() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const el = range.commonAncestorContainer.nodeType === 3
    ? range.commonAncestorContainer.parentElement
    : range.commonAncestorContainer;
  const editable = el.closest('[contenteditable="true"]');
  if (!editable) return null;
  return { range: range.cloneRange(), text: sel.toString(), editable };
}

async function applyLinkToSelection(pdfPath, file) {
  if (!selectedRange) return;
  const path = pdfPath.startsWith('pdfs/') ? pdfPath : 'pdfs/' + pdfPath.split('/').pop();
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
  const path = pdfPath.startsWith('pdfs/') ? pdfPath : 'pdfs/' + pdfPath.split('/').pop();
  if (file) await storePdf(path, file);
  anchor.href = await resolvePdfUrl(path);
  anchor.dataset.pdf = path;
}

function openPhoneModal(anchor) {
  activePhoneAnchor = anchor;
  document.getElementById('phone-modal-number').value = anchor.textContent.trim();
  document.getElementById('phone-modal-wa').value = anchor.href || waUrl(anchor.dataset.whatsapp);
  document.getElementById('phone-modal').classList.add('show');
}

function openEmailModal(anchor) {
  activeEmailAnchor = anchor;
  document.getElementById('email-modal-input').value = anchor.textContent.trim();
  document.getElementById('email-modal').classList.add('show');
}

function openPdfModal(anchor) {
  activeLinkAnchor = anchor;
  document.getElementById('pdf-modal-title').textContent = anchor.textContent;
  document.getElementById('pdf-modal-path').value = anchor.dataset.pdf || '';
  document.getElementById('pdf-modal-file').value = '';
  document.getElementById('pdf-modal').classList.add('show');
}

function enableEditables() {
  const editables = [
    '.ed-hero-title', '.ed-hero-sub', '.ed-hero-desc1', '.ed-hero-desc2',
    '.ed-credit', '.country-section h2',
    '.info-line-wrap p', '.contact-prefix',
    '.packages a.pdf-link', '.packages .validity'
  ];
  editables.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.contentEditable = 'true';
      el.spellcheck = false;
    });
  });

  document.querySelectorAll('a.pdf-link').forEach(a => {
    a.onclick = e => {
      if (!document.body.classList.contains('edit-mode')) return;
      e.preventDefault();
      openPdfModal(a);
    };
  });

  document.querySelectorAll('a.phone-link').forEach(a => {
    a.onclick = e => {
      if (!document.body.classList.contains('edit-mode')) return;
      e.preventDefault();
      openPhoneModal(a);
    };
  });

  document.querySelectorAll('a.contact-email').forEach(a => {
    a.onclick = e => {
      if (!document.body.classList.contains('edit-mode')) return;
      e.preventDefault();
      openEmailModal(a);
    };
  });
}

function createPhoneLink(number, whatsapp) {
  const wrap = document.createElement('span');
  wrap.className = 'phone-wrap';
  const a = document.createElement('a');
  a.href = waUrl(whatsapp || digitsOnly(number));
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'phone-link';
  a.textContent = number;
  a.dataset.whatsapp = whatsapp || digitsOnly(number);
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'phone-del-btn';
  del.title = 'Telefonu sil';
  del.textContent = '✕';
  wrap.appendChild(a);
  wrap.appendChild(del);
  return wrap;
}

function createPackageLi(title, pdf, validity) {
  const li = document.createElement('li');
  li.innerHTML = `
    <a href="#" class="pdf-link" data-pdf="${pdf}">${title}</a>
    <span class="validity">${validity}</span>
    <div class="pkg-edit-actions">
      <button type="button" class="pkg-btn pkg-pdf-btn" title="PDF dəyiş">PDF</button>
      <button type="button" class="pkg-btn pkg-del-btn" title="Sil">✕</button>
    </div>`;
  return li;
}

function createInfoTextWrap(text) {
  const wrap = document.createElement('div');
  wrap.className = 'info-line-wrap';
  wrap.innerHTML = `<p>${text}</p><button type="button" class="info-del-btn" title="Sil">✕</button>`;
  return wrap;
}

function createInfoLinkWrap() {
  const wrap = document.createElement('div');
  wrap.className = 'info-line-wrap';
  wrap.innerHTML = `
    <p data-rich="1">Mətn buraya <a href="#" class="pdf-link" data-pdf="pdfs/yeni.pdf">link buraya</a>.</p>
    <button type="button" class="info-del-btn" title="Sil">✕</button>`;
  return wrap;
}

function bindAllActions() {
  document.querySelectorAll('.phone-del-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('Bu telefonu silmək istəyirsiniz?')) return;
      const wrap = btn.closest('.phone-wrap');
      const or = wrap.previousElementSibling;
      if (or?.classList.contains('contact-or')) or.remove();
      wrap.remove();
    };
  });

  document.querySelectorAll('.se-add-phone').forEach(btn => {
    btn.onclick = () => {
      const phonesWrap = btn.closest('.country-section').querySelector('.phones-wrap');
      if (phonesWrap.querySelectorAll('.phone-wrap').length > 0) {
        const or = document.createElement('span');
        or.className = 'contact-or';
        or.textContent = ' or ';
        phonesWrap.appendChild(or);
      }
      const phoneWrap = createPhoneLink('+000 00 000 00 00', '00000000000');
      phonesWrap.appendChild(phoneWrap);
      enableEditables();
      bindAllActions();
      openPhoneModal(phoneWrap.querySelector('.phone-link'));
    };
  });

  document.querySelectorAll('.pkg-pdf-btn').forEach(btn => {
    btn.onclick = () => openPdfModal(btn.closest('li').querySelector('a.pdf-link'));
  });

  document.querySelectorAll('.pkg-del-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Paketi silmək istəyirsiniz?')) btn.closest('li').remove();
    };
  });

  document.querySelectorAll('.info-del-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Bu mətni silmək istəyirsiniz?')) btn.closest('.info-line-wrap').remove();
    };
  });

  document.querySelectorAll('.se-add-text').forEach(btn => {
    btn.onclick = () => {
      const block = btn.closest('.country-section').querySelector('.info-block');
      block.appendChild(createInfoTextWrap('Yeni mətn buraya yazın.'));
      enableEditables();
      bindAllActions();
      block.lastElementChild.querySelector('p').focus();
    };
  });

  document.querySelectorAll('.se-add-link').forEach(btn => {
    btn.onclick = () => {
      const block = btn.closest('.country-section').querySelector('.info-block');
      block.appendChild(createInfoLinkWrap());
      enableEditables();
      bindAllActions();
    };
  });

  document.querySelectorAll('.se-add-pkg').forEach(btn => {
    btn.onclick = () => {
      const ul = btn.closest('.country-section').querySelector('.packages');
      const li = createPackageLi('Yeni paket', 'pdfs/yeni-paket.pdf', '01.01.2026-31.12.2026 Validity');
      ul.appendChild(li);
      enableEditables();
      bindAllActions();
      li.querySelector('a').focus();
    };
  });

  document.querySelectorAll('.se-del-country').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('Bu ölkəni tamamilə silmək istəyirsiniz?')) return;
      btn.closest('.country-section').remove();
    };
  });

  const addCountryBtn = document.getElementById('add-country-btn');
  if (addCountryBtn) {
    addCountryBtn.onclick = async () => {
      editData = collectFromDOM();
      editData.countries.push({
        id: 'country_' + uid(),
        title: 'YENİ ÖLKƏ :',
        info: [],
        packages: [],
        contactPrefix: 'for more information please contact ',
        phones: [],
        email: 'info@zakher.travel'
      });
      await renderPage(editData, document.getElementById('app'));
      initEditModeUI();
      document.querySelectorAll('.country-section')[document.querySelectorAll('.country-section').length - 1]?.scrollIntoView({ behavior: 'smooth' });
      showToast('Yeni ölkə əlavə edildi');
    };
  }
}

function bindToolbar() {
  const btnLink = document.getElementById('btn-add-link');
  if (!btnLink) return;

  document.onselectionchange = () => {
    const sel = getSelectionInEditable();
    selectedRange = sel;
    btnLink.disabled = !sel || sel.text.length < 1;
  };

  btnLink.onclick = () => {
    const sel = getSelectionInEditable();
    if (!sel) return;
    selectedRange = sel;
    document.getElementById('modal-selected-text').textContent = `Seçilmiş: "${sel.text}"`;
    document.getElementById('modal-pdf-file').value = '';
    document.getElementById('modal-pdf-path').value = '';
    document.getElementById('link-modal').classList.add('show');
  };

  document.getElementById('modal-cancel').onclick = () =>
    document.getElementById('link-modal').classList.remove('show');

  document.getElementById('modal-confirm').onclick = async () => {
    const file = document.getElementById('modal-pdf-file').files[0];
    let path = document.getElementById('modal-pdf-path').value.trim();
    if (file) path = 'pdfs/' + file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
    if (!path) { showToast('PDF seçin'); return; }
    await applyLinkToSelection(path, file);
    document.getElementById('link-modal').classList.remove('show');
    enableEditables();
    bindAllActions();
    showToast('Link yaradıldı');
  };

  document.getElementById('pdf-modal-cancel').onclick = () =>
    document.getElementById('pdf-modal').classList.remove('show');

  document.getElementById('pdf-modal-confirm').onclick = async () => {
    const file = document.getElementById('pdf-modal-file').files[0];
    let path = document.getElementById('pdf-modal-path').value.trim();
    if (file) path = 'pdfs/' + file.name.replace(/[^a-zA-Z0-9._\-–]/g, '_');
    if (!path || !activeLinkAnchor) { showToast('PDF seçin'); return; }
    await applyPdfToAnchor(activeLinkAnchor, path, file);
    document.getElementById('pdf-modal').classList.remove('show');
    showToast('PDF yeniləndi');
  };

  const phoneNumInput = document.getElementById('phone-modal-number');
  const phoneWaInput = document.getElementById('phone-modal-wa');
  phoneNumInput.oninput = () => {
    phoneWaInput.value = waUrl(digitsOnly(phoneNumInput.value));
  };

  document.getElementById('phone-modal-cancel').onclick = () =>
    document.getElementById('phone-modal').classList.remove('show');

  document.getElementById('phone-modal-confirm').onclick = () => {
    if (!activePhoneAnchor) return;
    const number = phoneNumInput.value.trim();
    const wa = phoneWaInput.value.trim() || waUrl(digitsOnly(number));
    if (!number) { showToast('Nömrə daxil edin'); return; }
    activePhoneAnchor.textContent = number;
    activePhoneAnchor.href = wa;
    activePhoneAnchor.dataset.whatsapp = digitsOnly(wa) || digitsOnly(number);
    document.getElementById('phone-modal').classList.remove('show');
    showToast('Telefon yeniləndi');
  };

  document.getElementById('phone-modal-delete').onclick = () => {
    if (!activePhoneAnchor) return;
    const wrap = activePhoneAnchor.closest('.phone-wrap');
    const or = wrap?.previousElementSibling;
    if (or?.classList.contains('contact-or')) or.remove();
    wrap?.remove();
    document.getElementById('phone-modal').classList.remove('show');
    showToast('Telefon silindi');
  };

  document.getElementById('email-modal-cancel').onclick = () =>
    document.getElementById('email-modal').classList.remove('show');

  document.getElementById('email-modal-confirm').onclick = () => {
    if (!activeEmailAnchor) return;
    const email = document.getElementById('email-modal-input').value.trim();
    if (!email) { showToast('Email daxil edin'); return; }
    activeEmailAnchor.textContent = email;
    activeEmailAnchor.href = 'mailto:' + email;
    document.getElementById('email-modal').classList.remove('show');
    showToast('Email yeniləndi');
  };

  document.querySelectorAll('.edit-modal').forEach(m => {
    m.onclick = e => { if (e.target === m) m.classList.remove('show'); };
  });

  document.getElementById('btn-save').onclick = () => saveAndRefresh('Yadda saxlanıldı');

  document.getElementById('btn-export').onclick = () => {
    editData = collectFromDOM();
    saveContent(editData);
    exportContent(editData);
    showToast('content.json yükləndi');
  };

  document.getElementById('btn-exit').onclick = () => {
    destroySession();
    location.href = location.pathname;
  };
}

function initEditModeUI() {
  enableEditables();
  bindAllActions();
}

function initEditMode(data) {
  editData = data;
  document.body.classList.add('edit-mode');
  createToolbar();
  createModals();
  initEditModeUI();
  bindToolbar();

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveAndRefresh('Yadda saxlanıldı');
    }
  });
}
