const status = document.querySelector('#message');
async function post(url, data) {
  const csrf = await fetch('/api/auth/csrf').then(r => r.json());
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token }, body: JSON.stringify(data) });
}
document.querySelector('#login').addEventListener('submit', async e => {
  e.preventDefault(); const form = e.currentTarget; status.textContent = '';
  try {
    const response = await post('/api/auth/login', { email: form.email.value, password: form.password.value });
    form.password.value = '';
    if (!response.ok) throw Error();
    const factors = await fetch('/api/auth/factors').then(r => r.json());
    if (!factors.factors?.length) { status.textContent = 'MFA is required. Contact the project owner to arrange enrollment.'; return; }
    form.hidden = true; document.querySelector('#mfa').hidden = false;
  } catch { form.password.value = ''; status.textContent = 'Sign in unavailable or credentials invalid.'; }
});
document.querySelector('#mfa').addEventListener('submit', async e => {
  e.preventDefault(); const form = e.currentTarget;
  try {
    const factors = await fetch('/api/auth/factors').then(r => r.json());
    if (!factors.factors?.length || !(await post('/api/auth/mfa', { factorId: factors.factors[0].id, code: form.code.value })).ok) throw Error();
    form.code.value = ''; location.assign('/staff');
  } catch { form.code.value = ''; status.textContent = 'Verification failed or is unavailable.'; }
});
