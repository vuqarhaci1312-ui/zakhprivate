document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadContent();
  renderPage(data, document.getElementById('app'));
  initScrollAnimations();
});
