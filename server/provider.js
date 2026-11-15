import { createClient } from '@supabase/supabase-js';

export const authRequired = () => Object.assign(Error('Owner sign-in required'), { statusCode: 401 });
const check = ({ data, error, status }) => {
  if (error) {
    if (status === 401 || [400, 401, 403].includes(error.status)) throw authRequired();
    throw error;
  }
  return data;
};
export function validClaims(c, userId, url, now = Date.now() / 1000) {
  const pwd = Array.isArray(c.amr) ? c.amr.filter(x => x?.method === 'password').map(x => x.timestamp) : [];
  return c.sub === userId && c.iss === `${url}/auth/v1` && c.role === 'authenticated'
    && (c.aud === 'authenticated' || Array.isArray(c.aud) && c.aud.includes('authenticated'))
    && /^[0-9a-f-]{36}$/.test(c.session_id ?? '') && Number.isInteger(c.exp) && Number.isInteger(c.iat)
    && c.exp > now && c.iat <= now && c.exp - c.iat > 0 && c.exp - c.iat <= 300
    && pwd.length > 0 && pwd.every(Number.isInteger) && Math.min(...pwd) <= now;
}
export function supabaseAuth({ url, key }, { fetchImpl = fetch } = {}) {
  const transport = async (input, init) => {
    const target = new URL(typeof input === 'string' ? input : input.url ?? input.href);
    if (target.origin !== new URL(url).origin) throw Error('Provider origin rejected');
    return fetchImpl(input, { ...init, redirect: 'error', signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000) });
  };
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: transport } };
  const wrap = client => ({
    async verified() {
      const { session } = check(await client.auth.getSession());
      if (!session) throw authRequired();
      const { user } = check(await client.auth.getUser(session.access_token));
      const { data, error } = await client.auth.getClaims(session.access_token);
      if (error) {
        if (error.status >= 500 || error.name === 'AuthRetryableFetchError') throw error;
        throw authRequired();
      }
      if (!data?.claims || !validClaims(data.claims, user?.id, url)) throw authRequired();
      return { claims: data.claims, tokens: { access_token: session.access_token, refresh_token: session.refresh_token } };
    },
    async factors() { return check(await client.auth.mfa.listFactors()).totp.filter(x => x.status === 'verified').map(x => ({ id: x.id })); },
    async challenge(factorId, code) {
      const result = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error && [400, 401, 403].includes(result.error.status)) throw Object.assign(Error('Verification failed'), { statusCode: 403 });
      check(result);
    },
  });
  return {
    async login(email, password) {
      const client = createClient(url, key, options);
      check(await client.auth.signInWithPassword({ email, password }));
      return wrap(client);
    },
    async resume(tokens) {
      const client = createClient(url, key, options);
      // Called only while the durable app-session row is locked. SDK refresh
      // rotation is serialized across BFF processes, not browser cookie races.
      check(await client.auth.setSession(tokens));
      return wrap(client);
    },
    async rpc(accessToken, args) {
      // Explicit token callback prevents an implicit refresh between permit mint
      // and use. PostgREST independently verifies the actual owner's JWT.
      const client = createClient(url, key, { ...options, accessToken: async () => accessToken });
      return check(await client.rpc('owner_action', args));
    },
    async logout(accessToken) {
      // This is the same SDK method used internally by auth.signOut. It sends
      // this user's JWT to /logout; no service/admin key or refresh is used.
      const client = createClient(url, key, options);
      check(await client.auth.admin.signOut(accessToken, 'local'));
    },
  };
}
