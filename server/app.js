import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ownerCookie } from './owner-service.js';

const csrfCookie = '__Host-mc-owner-csrf';
const fail = (reply, status, error, code) => reply.code(status).send({ error, ...(code ? { code } : {}) });
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
    if (error.code === 'P0004') return fail(reply, 403, 'Verify a fresh authenticator code before saving.', 'STEP_UP_REQUIRED');
    if (error.statusCode === 401 || ['28000','28P01','23505'].includes(error.code)) return fail(reply, 401, 'Owner sign-in required, or session expired or revoked.', 'SIGN_IN_REQUIRED');
    if (error.statusCode === 403 || error.code === '42501') return fail(reply, 403, 'Access denied');
    if (error.statusCode === 429) return fail(reply, 429, 'Too many requests');
    if ([400,413,415].includes(error.statusCode) || error.code === '22023') return fail(reply, error.statusCode ?? 400, 'Invalid request');
    return fail(reply, 503, 'Owner service unavailable');
  });
  app.after(() => {
    const ready = async (_req, reply) => { if (!provider || !origin || !csrfSecret) return fail(reply, 503, 'Owner service unavailable'); };
    const token = req => createHmac('sha256', csrfSecret).update(JSON.stringify([req.cookies[csrfCookie], req.cookies[ownerCookie] ?? ''])).digest('hex');
    const csrf = (req, reply, done) => {
      const value = req.headers['x-csrf-token'];
      if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json'
        || !req.cookies[csrfCookie] || typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)
        || !timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(token(req), 'hex'))) {
        fail(reply, 403, 'Request rejected'); return;
      }
      done();
    };
    const load = name => readFile(new URL(name, import.meta.url), 'utf8');
    app.get('/owner/login', { preHandler: ready }, async (_req, reply) => reply.type('text/html').send(await load('login.html')));
    app.get('/owner/login.js', { preHandler: ready }, async (_req, reply) => reply.type('application/javascript').send(await load('login.js')));
    for (const [path, file, type] of [['/owner','owner.html','text/html'],['/owner/panel.js','owner.js','application/javascript']]) {
      app.get(path, { preHandler: ready }, async (req, reply) => {
        await provider(req, reply).run('status');
        return reply.type(type).send(await load(file));
      });
    }
    app.get('/api/owner/auth/csrf', { preHandler: ready }, async (req, reply) => {
      if (!/^[a-f0-9]{64}$/.test(req.cookies[csrfCookie] ?? '')) {
        req.cookies[csrfCookie] = randomBytes(32).toString('hex');
        reply.setCookie(csrfCookie, req.cookies[csrfCookie], { secure: true, httpOnly: true, sameSite: 'strict', path: '/' });
      }
      return { token: token(req) };
    });
    const sensitive = { preHandler: [ready, csrf], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };
    app.post('/api/owner/auth/login', sensitive, async (req, reply) => {
      const { email, password } = req.body ?? {};
      if (typeof email !== 'string' || !email || email.length > 254 || typeof password !== 'string' || !password || password.length > 1024) return fail(reply, 400, 'Invalid request');
      await provider(req, reply).login(email, password);
      return { ok: true };
    });
    app.get('/api/owner/auth/factors', { preHandler: ready }, (req, reply) => provider(req, reply).factors());
    app.post('/api/owner/auth/mfa', sensitive, async (req, reply) => {
      const { factorId, code } = req.body ?? {};
      if (typeof factorId !== 'string' || !/^[0-9a-f-]{36}$/.test(factorId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return fail(reply, 400, 'Invalid request');
      return provider(req, reply).mfa(factorId, code);
    });
    app.post('/api/owner/auth/logout', { preHandler: [ready, csrf] }, async (req, reply) => ({ ok: true, ...await provider(req, reply).logout() }));
    app.get('/api/owner/session', { preHandler: ready }, (req, reply) => provider(req, reply).run('status'));
    app.get('/api/owner/records', { preHandler: ready }, (req, reply) => provider(req, reply).run('records.read'));
    app.post('/api/owner/records', { preHandler: [ready, csrf], config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, (req, reply) => {
      const { note } = req.body ?? {};
      if (typeof note !== 'string' || note.length < 1 || note.length > 200 || !/^[\x20-\x7e]+$/.test(note)) return fail(reply, 400, 'Invalid request');
      return provider(req, reply).run('record.create', note);
    });
  });
  return app;
}
