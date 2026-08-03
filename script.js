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
      console.error('bootApp error:', err);
      appEl.innerHTML = '<p style="padding:40px;text-align:center;color:red">Sayt yüklənmədi: ' + err.message + '</p>';
    }
  }

  if (isAuthenticated()) {
    bootApp();
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    errorEl.style.color = '#ff3b30';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Yoxlanılır...';

    const username = document.getElementById('site-username').value.trim();
    const password = document.getElementById('site-password').value;

    if (!username || !password) {
      errorEl.textContent = 'İstifadəçi adı və şifrə daxil edin.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Daxil ol';
      return;
    }

    try {
      const result = await attemptLogin(username, password);
      if (result.ok) {
        errorEl.style.color = '#34c759';
        errorEl.textContent = 'Uğurlu! Sayt yüklənir...';
        await bootApp();
        return;
      }
      if (result.locked) {
        errorEl.textContent = 'Həddindən çox cəhd. ' + result.remaining + ' saniyə gözləyin.';
      } else {
        errorEl.textContent = 'İstifadəçi adı və ya şifrə yanlışdır. ' + result.attemptsLeft + ' cəhd qalıb.';
      }
    } catch (err) {
      console.error('Login error:', err);
      errorEl.textContent = 'Xəta: ' + (err.message || 'Bilinməyən xəta');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Daxil ol';
    }
  });
});
