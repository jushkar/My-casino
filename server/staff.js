const message = document.querySelector('#message');
async function post(url, data) {
  const csrf = await fetch('/api/auth/csrf').then(r => r.json());
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token }, body: JSON.stringify(data) });
}
async function refresh() {
  const r = await fetch('/api/staff/records'); if (!r.ok) throw Error();
  const { records } = await r.json(); const list = document.querySelector('#records'); list.replaceChildren();
  for (const record of records) { const item = document.createElement('li'); item.textContent = record.note; list.append(item); }
}
document.querySelector('#record').addEventListener('submit', async e => {
  e.preventDefault(); try { if (!(await post('/api/staff/records', { note: e.currentTarget.note.value })).ok) throw Error(); e.currentTarget.reset(); await refresh(); } catch { message.textContent = 'Request unavailable or access denied.'; }
});
document.querySelector('#logout').addEventListener('click', async () => {
  try { if (!(await post('/api/auth/logout', {})).ok) throw Error(); location.assign('/staff/login'); } catch { message.textContent = 'Sign out unavailable. Try again.'; }
});
refresh().catch(() => { message.textContent = 'Records unavailable or access denied.'; });
