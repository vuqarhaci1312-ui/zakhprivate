async function renderInfoLine(line, path) {
  if (line.type === 'text') {
    const p = document.createElement('p');
    p.textContent = line.content;
    p.dataset.edit = path;
    return p;
  }
  if (line.type === 'rich') {
    const p = document.createElement('p');
    p.dataset.edit = path;
    p.dataset.rich = '1';
    for (const part of line.parts) {
      if (part.type === 'text') {
        p.appendChild(document.createTextNode(part.value));
      } else if (part.type === 'link') {
        const a = document.createElement('a');
        a.href = await resolvePdfUrl(part.href);
        a.target = '_blank';
        a.textContent = part.text;
        a.dataset.pdf = part.href;
        a.className = 'pdf-link';
        p.appendChild(a);
      }
    }
    return p;
  }
  return null;
}

async function renderPackage(pkg, path) {
  const li = document.createElement('li');
  li.dataset.edit = path;
  const a = document.createElement('a');
  a.href = await resolvePdfUrl(pkg.pdf);
  a.target = '_blank';
  a.textContent = pkg.title;
  a.dataset.pdf = pkg.pdf;
  a.dataset.field = 'title';
  a.className = 'pdf-link';
  const span = document.createElement('span');
  span.className = 'validity';
  span.textContent = pkg.validity;
  span.dataset.field = 'validity';
  const actions = document.createElement('div');
  actions.className = 'pkg-edit-actions';
  actions.innerHTML = `
    <button type="button" class="pkg-btn pkg-pdf-btn" title="PDF dəyiş">PDF</button>
    <button type="button" class="pkg-btn pkg-del-btn" title="Sil">✕</button>
  `;
  li.appendChild(a);
  li.appendChild(span);
  li.appendChild(actions);
  return li;
}

async function renderCountry(country, idx) {
  const section = document.createElement('section');
  section.className = 'country-section';
  section.id = country.id;
  section.dataset.countryIdx = idx;

  const h2 = document.createElement('h2');
  h2.textContent = country.title;
  h2.dataset.edit = `countries.${idx}.title`;
  section.appendChild(h2);

  if (country.info?.length) {
    const infoBlock = document.createElement('div');
    infoBlock.className = 'info-block';
    for (let i = 0; i < country.info.length; i++) {
      const el = await renderInfoLine(country.info[i], `countries.${idx}.info.${i}`);
      if (el) infoBlock.appendChild(el);
    }
    section.appendChild(infoBlock);
  }

  const ul = document.createElement('ul');
  ul.className = 'packages';
  ul.dataset.edit = `countries.${idx}.packages`;
  for (let i = 0; i < country.packages.length; i++) {
    ul.appendChild(await renderPackage(country.packages[i], `countries.${idx}.packages.${i}`));
  }
  section.appendChild(ul);

  const contact = document.createElement('p');
  contact.className = 'contact';
  const contactSpan = document.createElement('span');
  contactSpan.textContent = country.contact + ' ';
  contactSpan.dataset.edit = `countries.${idx}.contact`;
  const emailLink = document.createElement('a');
  emailLink.href = 'mailto:' + country.email;
  emailLink.textContent = country.email;
  emailLink.dataset.edit = `countries.${idx}.email`;
  contact.appendChild(contactSpan);
  contact.appendChild(emailLink);
  section.appendChild(contact);

  return section;
}

async function renderPage(data, container) {
  container.innerHTML = '';

  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.innerHTML = `
    <h1 data-edit="hero.title"></h1>
    <p class="hero-sub" data-edit="hero.subtitle"></p>
    <p class="hero-desc" data-edit="hero.desc1"></p>
    <p class="hero-desc" data-edit="hero.desc2"></p>
  `;
  hero.querySelector('[data-edit="hero.title"]').textContent = data.hero.title;
  hero.querySelector('[data-edit="hero.subtitle"]').textContent = data.hero.subtitle;
  hero.querySelector('[data-edit="hero.desc1"]').textContent = data.hero.desc1;
  hero.querySelector('[data-edit="hero.desc2"]').textContent = data.hero.desc2;
  container.appendChild(hero);

  for (let i = 0; i < data.countries.length; i++) {
    container.appendChild(await renderCountry(data.countries[i], i));
  }

  const credit = document.createElement('p');
  credit.className = 'credit';
  credit.textContent = data.credit;
  credit.dataset.edit = 'credit';
  container.appendChild(credit);
}

function initScrollAnimations() {
  const sections = document.querySelectorAll('.country-section, .hero');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  sections.forEach(section => {
    if (section.classList.contains('hero')) {
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    } else {
      observer.observe(section);
    }
  });
}
