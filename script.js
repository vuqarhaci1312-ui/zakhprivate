document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.country-section, .hero');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  sections.forEach((section) => {
    if (section.classList.contains('hero')) {
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    } else {
      observer.observe(section);
    }
  });
});
