import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';

// Isolated Fastify tests: fake provider and fake data; no Supabase claim is made.
const origin = 'https://staff.example.test';
const fakeFactory = () => {
 const revoked = new Set();
 return (req, reply) => {
  const session = req.cookies['__Host-mc-auth'];
  return {
    async user() { if (session === 'outage') throw Error('secret provider detail'); return session && session !== 'expired' && session !== 'revoked' && !revoked.has(session) ? { id: 'synthetic' } : null; },
    async assurance() { return session === 'aal1' ? 'aal1' : 'aal2'; },
    async gate() { return session === 'nonstaff' ? 'forbidden' : session === 'dbrevoked' ? 'unauthenticated' : 'allowed'; },
    async records() { return [{ note: 'Synthetic test record' }]; },
    async createRecord(note) { return note; },
    async logout() { revoked.add(session); reply.clearCookie('__Host-mc-auth', { path: '/', secure: true, httpOnly: true, sameSite: 'lax' }); },
    async login() { reply.setCookie('__Host-mc-auth', 'staff', { path: '/', secure: true, httpOnly: true, sameSite: 'lax' }); },
    async factors() { return []; }, async verify() {},
  };
 };
};
const make = () => buildApp({ provider: fakeFactory(), origin, csrfSecret: 'this-is-a-synthetic-test-secret-only' });
const auth = value => value ? `__Host-mc-auth=${value}` : '';
async function csrf(app, authCookie) {
  const r = await app.inject({ method: 'GET', url: '/api/auth/csrf', headers: { cookie: authCookie } });
  assert.equal(r.statusCode, 200);
  const bootstrap = r.headers['set-cookie'].split(';')[0];
  return { cookie: [authCookie, bootstrap].filter(Boolean).join('; '), token: r.json().token };
}
async function post(app, url, state, payload = {}) {
  return app.inject({ method: 'POST', url, headers: { origin, 'content-type': 'application/json', cookie: state.cookie, 'x-csrf-token': state.token }, payload });
}

test('isolated staff authorization rejects anonymous, nonstaff, forged role, MFA and revoked sessions', async () => {
  const app = make();
  try {
    for (const [value, code] of [['',401], ['nonstaff',403], ['aal1',403], ['expired',401], ['revoked',401], ['dbrevoked',401], ['staff',200]]) {
      const r = await app.inject({ method:'GET', url:'/api/staff/records', headers: { cookie:auth(value), 'x-role':'admin' } });
      assert.equal(r.statusCode, code, value || 'anonymous');
      if (code !== 200) assert.ok(!r.body.includes('Synthetic test record'));
    }
    assert.equal((await app.inject({url:'/staff', headers:{cookie:auth('nonstaff')}})).statusCode,403);
    assert.equal((await app.inject({url:'/staff', headers:{cookie:auth('staff')}})).statusCode,200);
  } finally { await app.close(); }
});

test('isolated origin, CSRF binding, validation and logout', async () => {
  const app = make();
  try {
    const s = await csrf(app, auth('staff'));
    assert.equal((await post(app,'/api/staff/records',s,{note:'demo'})).statusCode, 200);
    for (const headers of [
      { cookie:s.cookie, 'content-type':'application/json' },
      { cookie:s.cookie, 'content-type':'application/json', origin:'https://evil.test', 'x-csrf-token':s.token },
      { cookie:s.cookie, 'content-type':'application/json', origin, 'x-csrf-token':'0'.repeat(64) },
      { cookie:s.cookie.replace('auth=staff','auth=nonstaff'), 'content-type':'application/json', origin, 'x-csrf-token':s.token },
    ]) assert.equal((await app.inject({method:'POST',url:'/api/staff/records',headers,payload:{note:'demo'}})).statusCode,403);
    assert.equal((await post(app,'/api/staff/records',s,{note:'\n'})).statusCode,400);
    const logout = await post(app, '/api/auth/logout', s);
    assert.equal(logout.statusCode, 200); assert.match(logout.headers['set-cookie'], /Max-Age=0/);
    assert.equal((await app.inject({url:'/api/staff/records', headers:{cookie:auth('staff')}})).statusCode, 401);
  } finally { await app.close(); }
});

test('unavailable provider yields safe 503; disabled server stays closed', async () => {
  const app = make();
  const closed = buildApp();
  try {
    const r = await app.inject({url:'/api/staff/records',headers:{cookie:auth('outage')}});
    assert.equal(r.statusCode,503); assert.ok(!r.body.includes('secret provider detail'));
    assert.equal((await closed.inject({url:'/staff'})).statusCode,503);
  } finally { await app.close(); await closed.close(); }
});

test('isolated valid-CSRF write still requires a staff session and MFA', async () => {
  const app = make();
  try {
    for (const [value, expected] of [['', 401], ['nonstaff', 403], ['aal1', 403], ['expired', 401], ['dbrevoked', 401]]) {
      const state = await csrf(app, auth(value));
      assert.equal((await post(app, '/api/staff/records', state, {note:'demo'})).statusCode, expected, value || 'anonymous');
    }
  } finally { await app.close(); }
});

test('isolated login is rate limited and requires same-origin CSRF', async () => {
  const app = make();
  try {
    const state = await csrf(app, '');
    const invalid = await app.inject({method:'POST',url:'/api/auth/login',headers:{origin, 'content-type':'application/json'},payload:{email:'test@example.test',password:'test'}});
    assert.equal(invalid.statusCode, 403);
    for (let i=0;i<4;i++) assert.equal((await post(app,'/api/auth/login',state,{email:'test@example.test',password:'test'})).statusCode,200);
    assert.equal((await post(app,'/api/auth/login',state,{email:'test@example.test',password:'test'})).statusCode,429);
  } finally { await app.close(); }
});

test('invalid staff input is rejected before the activity gate', async () => {
  let gateCalls = 0;
  const provider = (req, reply) => ({ ...fakeFactory()(req, reply), gate: async () => { gateCalls++; return 'allowed'; } });
  const app = buildApp({ provider, origin, csrfSecret: 'this-is-a-synthetic-test-secret-only' });
  try {
    const state = await csrf(app, auth('staff'));
    assert.equal((await post(app, '/api/staff/records', state, {note:'\n'})).statusCode,400);
    assert.equal(gateCalls,0);
  } finally { await app.close(); }
});
