document.addEventListener('DOMContentLoaded', () => {
  const loginEl = document.getElementById('site-login');
  const appEl = document.getElementById('app');
  const form = document.getElementById('site-login-form');
  const errorEl = document.getElementById('site-login-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  async function bootApp() {
    loginEl.hidden = true;
    appEl.hidden = false;
    const data = await loadContent();
    await renderPage(data, appEl);
    initScrollAnimations();

    const editMode = new URLSearchParams(location.search).get('edit') === '1';
    if (editMode && isAuthenticated() && hasSaveToken()) {
      initEditMode(data);
    } else if (editMode) {
      location.href = 'admin/';
    }
  }

  if (isAuthenticated()) {
    bootApp();
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gözləyin...';
    const username = document.getElementById('site-username').value.trim();
    const password = document.getElementById('site-password').value;
    try {
      const result = await attemptLogin(username, password);
      if (result.ok) {
        await bootApp();
        return;
      }
      if (result.locked) {
        errorEl.textContent = 'Çox cəhd. ' + result.remaining + ' saniyə gözləyin.';
      } else {
        errorEl.textContent = 'Yanlış giriş. ' + result.attemptsLeft + ' cəhd qaldı.';
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Giriş xətası baş verdi';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Daxil ol';
    }
  });
});
