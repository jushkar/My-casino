const message = document.querySelector('#message');
const signin = document.querySelector('#signin');
let idleDeadline = 0, absoluteDeadline = 0;
async function read(response) {
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      signin.hidden = false;
      document.querySelector('#records').replaceChildren();
    }
    if (body.code === 'STEP_UP_REQUIRED') document.querySelector('#stepup').hidden = false;
    throw Error(body.error || 'Owner service unavailable');
  }
  if (body.idleExpiresAt) {
    idleDeadline = Date.parse(body.idleExpiresAt); absoluteDeadline = Date.parse(body.absoluteExpiresAt);
    signin.hidden = true;
  }
  return body;
}
async function post(url, data) {
  const csrf = await fetch('/api/owner/auth/csrf').then(read);
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token }, body: JSON.stringify(data) }).then(read);
}
async function refresh() {
  const { records } = await fetch('/api/owner/records').then(read);
  const list = document.querySelector('#records'); list.replaceChildren();
  for (const record of records) { const item = document.createElement('li'); item.textContent = record.note; list.append(item); }
}
document.querySelector('#record').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  try {
    await post('/api/owner/records', { note: form.note.value });
    form.reset(); message.textContent = 'Note saved.'; await refresh();
  } catch (error) { message.textContent = error.message + ' Your unsaved note remains in this tab.'; }
});
document.querySelector('#stepup').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  try {
    const { factors } = await fetch('/api/owner/auth/factors').then(read);
    if (!factors?.length) throw Error('Authenticator enrollment requires the trusted operator.');
    await post('/api/owner/auth/mfa', { factorId: factors[0].id, code: form.code.value });
    form.hidden = true; message.textContent = 'Verified. Review your note and choose Save note.';
  } catch (error) { message.textContent = error.message; } finally { form.code.value = ''; }
});
document.querySelector('#retry').addEventListener('click', () => refresh().then(() => { message.textContent = 'Access restored. Review your note before saving.'; }).catch(error => { message.textContent = error.message; }));
document.querySelector('#logout').addEventListener('click', async () => {
  try { await post('/api/owner/auth/logout', {}); document.querySelector('#record').reset(); location.assign('/owner/login'); }
  catch (error) { message.textContent = error.message; }
});
// Display only: no background heartbeat that silently renews inactivity.
setInterval(() => {
  if (!idleDeadline) return;
  const left = Math.min(idleDeadline, absoluteDeadline) - Date.now();
  document.querySelector('#expiry').textContent = left > 0
    ? `Access expires in about ${Math.ceil(left / 60000)} minutes without activity. Absolute end: ${new Date(absoluteDeadline).toLocaleTimeString()}.`
    : 'Session time has elapsed. Sign in again; your unsaved note remains in this tab.';
  if (left <= 0) { signin.hidden = false; document.querySelector('#records').replaceChildren(); }
}, 1000);
refresh().catch(error => { message.textContent = error.message; });
