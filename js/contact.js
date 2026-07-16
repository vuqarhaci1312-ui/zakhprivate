function digitsOnly(num) {
  return (num || '').replace(/\D/g, '');
}

function waUrl(whatsapp) {
  const d = digitsOnly(whatsapp);
  return d ? `https://wa.me/${d}` : '#';
}

function normalizeCountry(country) {
  if (country.phones) {
    return {
      ...country,
      contactPrefix: country.contactPrefix || 'for more information please contact ',
      phones: country.phones.map(p => ({
        number: p.number,
        whatsapp: p.whatsapp || digitsOnly(p.number)
      })),
      email: country.email || 'info@zakher.travel'
    };
  }
  const text = country.contact || '';
  const phones = [];
  const matches = text.match(/\+[\d][\d\s]{6,}/g) || [];
  matches.forEach(num => {
    phones.push({ number: num.trim(), whatsapp: digitsOnly(num) });
  });
  let prefix = text;
  matches.forEach(num => { prefix = prefix.split(num).join(''); });
  prefix = prefix.replace(/\s+or\s+/gi, ' ').replace(/\s*email:?\s*$/i, '').trim();
  if (prefix && !prefix.endsWith(' ')) prefix += ' ';
  return {
    ...country,
    contactPrefix: prefix || 'for more information please contact ',
    phones,
    email: country.email || 'info@zakher.travel'
  };
}

function renderContact(country) {
  const c = normalizeCountry(country);
  const p = document.createElement('p');
  p.className = 'contact';

  const prefix = document.createElement('span');
  prefix.className = 'contact-prefix';
  prefix.textContent = c.contactPrefix;
  p.appendChild(prefix);

  const phonesWrap = document.createElement('span');
  phonesWrap.className = 'phones-wrap';
  c.phones.forEach((phone, i) => {
    if (i > 0) {
      const or = document.createElement('span');
      or.className = 'contact-or';
      or.textContent = ' or ';
      phonesWrap.appendChild(or);
    }
    const a = document.createElement('a');
    a.href = waUrl(phone.whatsapp);
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'phone-link';
    a.textContent = phone.number;
    a.dataset.whatsapp = phone.whatsapp;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'phone-del-btn';
    del.title = 'Telefonu sil';
    del.textContent = '✕';
    const wrap = document.createElement('span');
    wrap.className = 'phone-wrap';
    wrap.appendChild(a);
    wrap.appendChild(del);
    phonesWrap.appendChild(wrap);
  });
  p.appendChild(phonesWrap);

  const emailLabel = document.createElement('span');
  emailLabel.className = 'contact-email-label';
  emailLabel.textContent = ' email: ';
  p.appendChild(emailLabel);

  const emailLink = document.createElement('a');
  emailLink.href = 'mailto:' + c.email;
  emailLink.className = 'contact-email';
  emailLink.textContent = c.email;
  p.appendChild(emailLink);

  return p;
}
