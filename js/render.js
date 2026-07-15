function renderInfoLine(line) {
  if (line.type === 'text') {
    const p = document.createElement('p');
    p.textContent = line.content;
    return p;
  }
  if (line.type === 'rich') {
    const p = document.createElement('p');
    line.parts.forEach(part => {
      if (part.type === 'text') {
        p.appendChild(document.createTextNode(part.value));
      } else if (part.type === 'link') {
        const a = document.createElement('a');
        a.href = resolvePdfUrl(part.href);
        a.target = '_blank';
        a.textContent = part.text;
        p.appendChild(a);
      }
    });
    return p;
  }
  return null;
}

function renderPackage(pkg) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = resolvePdfUrl(pkg.pdf);
  a.target = '_blank';
  a.textContent = pkg.title;
  const span = document.createElement('span');
  span.className = 'validity';
  span.textContent = pkg.validity;
  li.appendChild(a);
  li.appendChild(span);
  return li;
}

function renderCountry(country) {
  const section = document.createElement('section');
  section.className = 'country-section';
  section.id = country.id;

  const h2 = document.createElement('h2');
  h2.textContent = country.title;
  section.appendChild(h2);

  if (country.info && country.info.length) {
    const infoBlock = document.createElement('div');
    infoBlock.className = 'info-block';
    country.info.forEach(line => {
      const el = renderInfoLine(line);
      if (el) infoBlock.appendChild(el);
    });
    section.appendChild(infoBlock);
  }

  if (country.packages && country.packages.length) {
    const ul = document.createElement('ul');
    ul.className = 'packages';
    country.packages.forEach(pkg => ul.appendChild(renderPackage(pkg)));
    section.appendChild(ul);
  }

  const contact = document.createElement('p');
  contact.className = 'contact';
  contact.appendChild(document.createTextNode(country.contact + ' '));
  const emailLink = document.createElement('a');
  emailLink.href = 'mailto:' + country.email;
  emailLink.textContent = country.email;
  contact.appendChild(emailLink);
  section.appendChild(contact);

  return section;
}

function renderPage(data, container) {
  container.innerHTML = '';

  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.innerHTML = `
    <h1>${escapeHtml(data.hero.title)}</h1>
    <p class="hero-sub">${escapeHtml(data.hero.subtitle)}</p>
    <p class="hero-desc">${escapeHtml(data.hero.desc1)}</p>
    <p class="hero-desc">${escapeHtml(data.hero.desc2)}</p>
  `;
  container.appendChild(hero);

  data.countries.forEach(country => container.appendChild(renderCountry(country)));

  const credit = document.createElement('p');
  credit.className = 'credit';
  credit.textContent = data.credit;
  container.appendChild(credit);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
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
