document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('zakher_lock');

  const loginEl = document.getElementById('site-login');
  const appEl = document.getElementById('app');
  const form = document.getElementById('site-login-form');
  const errorEl = document.getElementById('site-login-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  async function bootApp() {
    loginEl.style.display = 'none';
    appEl.hidden = false;
    try {
      const data = await loadContent();
      await renderPage(data, appEl);
      initScrollAnimations();

      const editMode = new URLSearchParams(location.search).get('edit') === '1';
      if (editMode && isAuthenticated() && hasSaveToken()) {
        initEditMode(data);
      } else if (editMode) {
        location.href = 'admin/';
      }
    } catch (err) {
      appEl.innerHTML = '<p style="padding:40px;text-align:center;color:red">Sayt yüklənmədi: ' + err.message + '</p>';
    }
  }

  if (isSiteAuthenticated()) {
    bootApp();
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    errorEl.style.color = '#ff3b30';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    const username = document.getElementById('site-username').value.trim();
    const password = document.getElementById('site-password').value;

    if (!username || !password) {
      errorEl.textContent = 'Enter username and password.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
      return;
    }

    try {
      const result = await attemptSiteLogin(username, password);
      if (result.ok) {
        errorEl.style.color = '#34c759';
        errorEl.textContent = 'Success! Loading site...';
        await bootApp();
        return;
      }
      if (result.locked) {
        errorEl.textContent = 'Too many attempts. Wait ' + result.remaining + ' seconds.';
      } else {
        errorEl.textContent = 'Invalid username or password. ' + result.attemptsLeft + ' attempts left.';
      }
    } catch (err) {
      errorEl.textContent = 'Error: ' + (err.message || 'Unknown error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
});
