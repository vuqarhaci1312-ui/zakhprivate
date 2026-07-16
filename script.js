document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadContent();
  await renderPage(data, document.getElementById('app'));
  initScrollAnimations();

  const editMode = new URLSearchParams(location.search).get('edit') === '1';
  if (editMode && isAuthenticated() && hasSaveToken()) {
    initEditMode(data);
  } else if (editMode) {
    location.href = 'admin/';
  }
});
