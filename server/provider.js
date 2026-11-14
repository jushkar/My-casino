import { createServerClient } from '@supabase/ssr';
import { randomBytes } from 'node:crypto';

const staffCookie = '__Host-mc-staff';
const cookieOptions = { path: '/', secure: true, httpOnly: true, sameSite: 'lax' };
const denied = (statusCode = 401) => Object.assign(new Error('Access denied'), { statusCode });

// Signed claims are passed here ONLY after getClaims() and online getUser().
export function withinStaffWindow(claims, userId, url, now = Date.now() / 1000) {
  const times = Array.isArray(claims.amr) ? claims.amr.filter(x => x.method === 'password').map(x => x.timestamp) : [];
  return claims.sub === userId && claims.iss === `${url}/auth/v1` && claims.role === 'authenticated'
    && (claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.includes('authenticated'))
    && /^[0-9a-f-]{36}$/.test(claims.session_id ?? '') && Number.isInteger(claims.exp) && claims.exp > now
    && times.length > 0 && times.every(Number.isInteger) && Math.min(...times) <= now && now < Math.min(...times) + 300;
}

// Explicit transport barrier: autoRefreshToken:false alone does not prevent
// SDK session loading from trying a refresh. There is no BFF refresh endpoint.
export function noRefreshFetch(url, fetchImpl = fetch) {
  return async (input, init) => {
    const target = new URL(typeof input === 'string' ? input : input.url ?? input.href);
    if (target.origin !== new URL(url).origin) throw new Error('Provider origin rejected');
    if (target.pathname === '/auth/v1/token' && target.searchParams.get('grant_type') !== 'password') {
      return new Response(JSON.stringify({ code: 'session_not_found', msg: 'Reauthentication required' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    return fetchImpl(input, { ...init, redirect: 'error', signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
  };
}

export function supabaseProvider({ url, key }, { fetchImpl = fetch } = {}) {
  return (request, reply) => {
    const cookies = { ...request.cookies };
    const client = createServerClient(url, key, {
      cookieOptions: { name: '__Host-mc-auth', ...cookieOptions },
      auth: { autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: noRefreshFetch(url, fetchImpl) },
      cookies: {
        getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
        setAll: items => { for (const { name, value, options } of items) {
          cookies[name] = value;
          reply.setCookie(name, value, { ...options, ...cookieOptions, domain: undefined });
        } },
      },
    });
    const check = ({ data, error }) => {
      if (error) {
        if ([400, 401, 403].includes(error.status)) throw Object.assign(error, { statusCode: 401 });
        if (error.code === '42501') throw denied(403);
        throw error;
      }
      return data;
    };
    let identity;
    async function verified() {
      if (identity !== undefined) return identity;
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error && [400, 401, 403].includes(sessionResult.error.status)) return identity = null;
      const { session } = check(sessionResult);
      if (!session) return identity = null;
      const userResult = await client.auth.getUser(session.access_token);
      if (userResult.error) {
        if ([400, 401, 403].includes(userResult.error.status)) return identity = null;
        throw userResult.error;
      }
      const result = await client.auth.getClaims(session.access_token);
      if (result.error && (result.error.status >= 500 || result.error.name === 'AuthRetryableFetchError')) throw result.error;
      if (result.error || !result.data?.claims) return identity = null;
      const claims = result.data.claims, user = userResult.data.user;
      if (!withinStaffWindow(claims, user.id, url)) return identity = null;
      return identity = { user, claims };
    }
    const cap = () => cookies[staffCookie] ?? '';
    return {
      async login(email, password) { check(await client.auth.signInWithPassword({ email, password })); identity = undefined; },
      async user() { return (await verified())?.user ?? null; },
      async assurance() { return (await verified())?.claims.aal ?? null; },
      async factors() { return check(await client.auth.mfa.listFactors()).totp.filter(x => x.status === 'verified').map(x => ({ id: x.id })); },
      async verify(factorId, code) { check(await client.auth.mfa.challengeAndVerify({ factorId, code })); identity = undefined; },
      async open() {
        const current = await verified(); if (!current) throw denied();
        if (current.claims.aal !== 'aal2') throw denied(403);
        const value = randomBytes(32).toString('hex');
        const result = check(await client.rpc('staff_session_open', { p_cap: value }));
        if (result !== 'allowed') throw denied(result === 'forbidden' ? 403 : 401);
        cookies[staffCookie] = value;
        reply.setCookie(staffCookie, value, { ...cookieOptions, maxAge: 300 });
      },
      async gate() { return check(await client.rpc('staff_gate', { p_cap: cap() })); },
      async records() { return check(await client.rpc('staff_records_list', { p_cap: cap() })); },
      async createRecord(note) { return check(await client.rpc('staff_record_create', { p_cap: cap(), p_note: note })); },
      async logout() {
        // PostgREST verifies the JWT. Do not require getUser/role/AAL to revoke
        // one's application session: Auth may be unavailable or staff disabled.
        if (check(await client.rpc('staff_session_close')) !== 'revoked') throw denied();
        let providerLogout = 'unconfirmed';
        try { if (!(await client.auth.signOut({ scope: 'local' })).error) providerLogout = 'sdk-success'; } catch { /* durable local revocation already committed */ }
        for (const name of Object.keys(cookies)) {
          if (name === staffCookie || name === '__Host-mc-csrf' || name.startsWith('__Host-mc-auth')) reply.clearCookie(name, cookieOptions);
        }
        identity = null;
        return { appRevoked: true, providerLogout };
      },
    };
  };
}
