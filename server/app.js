import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const cookieName = '__Host-mc-csrf';
const fail = (reply, status, error) => reply.code(status).send({ error });

export function buildApp({ provider = null, origin = null, csrfSecret = null } = {}) {
  const app = Fastify({ logger: false, bodyLimit: 4096, trustProxy: false });
  app.register(cookie);
  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('Cache-Control', 'no-store, private').header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer').header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    return payload;
  });
  app.setErrorHandler((error, _req, reply) => {
    if (error.statusCode === 429) return fail(reply, 429, 'Too many requests');
    if (error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415) return fail(reply, error.statusCode, 'Invalid request');
    return fail(reply, 503, 'Staff service unavailable');
  });
  app.after(() => {
  const ready = async (_req, reply) => { if (!provider || !origin || !csrfSecret) return fail(reply, 503, 'Staff service unavailable'); };
  const token = (req) => {
    const auth = Object.entries(req.cookies).filter(([key]) => key === '__Host-mc-auth' || key.startsWith('__Host-mc-auth.')).sort(([a], [b]) => a.localeCompare(b));
    return createHmac('sha256', csrfSecret).update(JSON.stringify([req.cookies[cookieName], auth])).digest('hex');
  };
  const csrf = (req, reply, done) => {
    const header = req.headers['x-csrf-token'];
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json' || !req.cookies[cookieName] || typeof header !== 'string' || !/^[a-f0-9]{64}$/.test(header)) {
      fail(reply, 403, 'Request rejected'); return;
    }
    const actual = Buffer.from(header, 'hex'), expected = Buffer.from(token(req), 'hex');
    if (!timingSafeEqual(actual, expected)) { fail(reply, 403, 'Request rejected'); return; }
    done();
  };
  const identity = async (req, reply) => {
    const client = provider(req, reply);
    const user = await client.user();
    if (!user) { fail(reply, 401, 'Authentication required'); return null; }
    return client;
  };
  const staff = async (req, reply) => {
    const client = await identity(req, reply);
    if (!client) return null;
    if (await client.assurance() !== 'aal2') { fail(reply, 403, 'Access denied'); return null; }
    const gate = await client.gate();
    if (gate === 'unauthenticated') { fail(reply, 401, 'Authentication required'); return null; }
    if (gate !== 'allowed') { fail(reply, 403, 'Access denied'); return null; }
    return client;
  };
  const load = async name => readFile(new URL(`./${name}`, import.meta.url), 'utf8');
  app.get('/staff/login', { preHandler: ready }, async (_req, reply) => reply.type('text/html').send(await load('login.html')));
  app.get('/staff/login.js', { preHandler: ready }, async (_req, reply) => reply.type('application/javascript').send(await load('login.js')));
  app.get('/staff/staff.js', { preHandler: ready }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    return reply.type('application/javascript').send(await load('staff.js'));
  });
  app.get('/staff', { preHandler: ready }, async (req, reply) => {
    if (!await staff(req, reply)) return;
    return reply.type('text/html').send(await load('staff.html'));
  });
  app.get('/api/auth/csrf', { preHandler: ready }, async (req, reply) => {
    if (!req.cookies[cookieName] || !/^[a-f0-9]{64}$/.test(req.cookies[cookieName])) {
      req.cookies[cookieName] = randomBytes(32).toString('hex');
      reply.setCookie(cookieName, req.cookies[cookieName], { secure: true, httpOnly: true, sameSite: 'strict', path: '/' });
    }
    return { token: token(req) };
  });
  const sensitive = { preHandler: [ready, csrf], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };
  app.post('/api/auth/login', sensitive, async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 1024 || !email || !password) return fail(reply, 400, 'Invalid request');
    try { await provider(req, reply).login(email, password); } catch (e) {
      if (e.status === 400 || e.status === 401) return fail(reply, 401, 'Authentication failed');
      throw e;
    }
    return { ok: true };
  });
  app.get('/api/auth/factors', { preHandler: ready }, async (req, reply) => {
    const client = await identity(req, reply); if (!client) return;
    return { factors: await client.factors() };
  });
  app.post('/api/auth/mfa', sensitive, async (req, reply) => {
    const client = await identity(req, reply); if (!client) return;
    const { factorId, code } = req.body ?? {};
    if (typeof factorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(factorId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return fail(reply, 400, 'Invalid request');
    try { await client.verify(factorId, code); } catch (e) { if (e.status === 400 || e.status === 401 || e.status === 403) return fail(reply, 403, 'Verification failed'); throw e; }
    return { ok: true };
  });
  app.post('/api/auth/logout', { preHandler: [ready, csrf] }, async (req, reply) => {
    const client = await identity(req, reply); if (!client) return;
    await client.logout();
    return { ok: true };
  });
  app.get('/api/staff/records', { preHandler: ready }, async (req, reply) => {
    const client = await staff(req, reply); if (!client) return;
    return { records: await client.records() };
  });
  app.post('/api/staff/records', { preHandler: [ready, csrf], config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { note } = req.body ?? {};
    if (typeof note !== 'string' || note.length < 1 || note.length > 200 || !/^[\x20-\x7e]+$/.test(note)) return fail(reply, 400, 'Invalid request');
    const client = await staff(req, reply); if (!client) return;
    return { record: await client.createRecord(note) };
  });
  });
  return app;
}
