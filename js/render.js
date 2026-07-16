async function renderInfoLine(line) {
  const wrap = document.createElement('div');
  wrap.className = 'info-line-wrap';

  let p;
  if (line.type === 'text') {
    p = document.createElement('p');
    p.textContent = line.content;
  } else if (line.type === 'rich') {
    p = document.createElement('p');
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
  }
  if (p) {
    p.dataset.infoLine = '1';
    wrap.appendChild(p);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'info-del-btn';
    del.title = 'Sil';
    del.textContent = '✕';
    wrap.appendChild(del);
  }
  return wrap;
}

async function renderPackage(pkg) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = await resolvePdfUrl(pkg.pdf);
  a.target = '_blank';
  a.textContent = pkg.title;
  a.dataset.pdf = pkg.pdf;
  a.className = 'pdf-link';
  const span = document.createElement('span');
  span.className = 'validity';
  span.textContent = pkg.validity;
  const actions = document.createElement('div');
  actions.className = 'pkg-edit-actions';
  actions.innerHTML = `
    <button type="button" class="pkg-btn pkg-pdf-btn" title="PDF əlavə et / dəyiş">PDF</button>
    <button type="button" class="pkg-btn pkg-del-btn" title="Sil">✕</button>
  `;
  li.appendChild(a);
  li.appendChild(span);
  li.appendChild(actions);
  return li;
}

async function renderCountry(country, idx) {
  const section = document.createElement('section');
  section.className = 'country-section visible';
  section.id = country.id;
  section.dataset.countryIdx = idx;

  const bar = document.createElement('div');
  bar.className = 'section-edit-bar';
  bar.innerHTML = `
    <button type="button" class="se-btn se-add-text">+ Mətn</button>
    <button type="button" class="se-btn se-add-link">+ Link bloku</button>
    <button type="button" class="se-btn se-add-phone">+ Telefon</button>
    <button type="button" class="se-btn se-add-pkg">+ PDF paket</button>
    <button type="button" class="se-btn se-del-country">Ölkəni sil</button>
  `;
  section.appendChild(bar);

  const h2 = document.createElement('h2');
  h2.textContent = country.title;
  section.appendChild(h2);

  const infoBlock = document.createElement('div');
  infoBlock.className = 'info-block';
  if (country.info?.length) {
    for (const line of country.info) {
      infoBlock.appendChild(await renderInfoLine(line));
    }
  }
  section.appendChild(infoBlock);

  const ul = document.createElement('ul');
  ul.className = 'packages';
  for (const pkg of country.packages) {
    ul.appendChild(await renderPackage(pkg));
  }
  section.appendChild(ul);

  const addPkgBtn = document.createElement('button');
  addPkgBtn.type = 'button';
  addPkgBtn.className = 'add-pkg-btn se-add-pkg';
  addPkgBtn.textContent = '+ PDF paket əlavə et';
  section.appendChild(addPkgBtn);

  const contact = renderContact(country);
  section.appendChild(contact);

  return section;
}

async function renderPage(data, container) {
  container.innerHTML = '';

  const hero = document.createElement('section');
  hero.className = 'hero visible';
  hero.style.opacity = '1';
  hero.style.transform = 'none';
  hero.innerHTML = `
    <h1 class="ed-hero-title"></h1>
    <p class="hero-sub ed-hero-sub"></p>
    <p class="hero-desc ed-hero-desc1"></p>
    <p class="hero-desc ed-hero-desc2"></p>
  `;
  hero.querySelector('.ed-hero-title').textContent = data.hero.title;
  hero.querySelector('.ed-hero-sub').textContent = data.hero.subtitle;
  hero.querySelector('.ed-hero-desc1').textContent = data.hero.desc1;
  hero.querySelector('.ed-hero-desc2').textContent = data.hero.desc2;
  container.appendChild(hero);

  const countriesWrap = document.createElement('div');
  countriesWrap.id = 'countries-wrap';
  for (let i = 0; i < data.countries.length; i++) {
    countriesWrap.appendChild(await renderCountry(data.countries[i], i));
  }
  container.appendChild(countriesWrap);

  const addCountryBtn = document.createElement('button');
  addCountryBtn.type = 'button';
  addCountryBtn.id = 'add-country-btn';
  addCountryBtn.className = 'add-country-btn';
  addCountryBtn.textContent = '+ Yeni ölkə əlavə et';
  container.appendChild(addCountryBtn);

  const credit = document.createElement('p');
  credit.className = 'credit ed-credit';
  credit.textContent = data.credit;
  container.appendChild(credit);
}

function initScrollAnimations() {
  if (document.body.classList.contains('edit-mode')) return;
  const sections = document.querySelectorAll('.country-section:not(.visible), .hero:not(.visible)');
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
  sections.forEach(section => observer.observe(section));
}
