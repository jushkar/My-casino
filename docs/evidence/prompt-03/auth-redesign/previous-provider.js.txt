import { createServerClient } from '@supabase/ssr';

// One client per request. Never pass a service-role/secret key here.
export function supabaseProvider({ url, key }) {
  return (request, reply) => {
    const cookies = { ...request.cookies };
    const client = createServerClient(url, key, {
      cookieOptions: { name: '__Host-mc-auth', path: '/', secure: true, httpOnly: true, sameSite: 'lax' },
      cookies: {
        getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
        setAll: (items) => {
          for (const { name, value, options } of items) {
            cookies[name] = value;
            reply.setCookie(name, value, { ...options, path: '/', secure: true, httpOnly: true, sameSite: 'lax', domain: undefined });
          }
        },
      },
    });
    const check = ({ data, error }) => { if (error) throw error; return data; };
    return {
      async login(email, password) { check(await client.auth.signInWithPassword({ email, password })); },
      async user() {
        const { data, error } = await client.auth.getUser();
        if (error) {
          // Auth errors are not all invalid credentials: outages must fail closed as 503.
          if (error.status === 400 || error.status === 401 || error.status === 403 || error.name === 'AuthSessionMissingError') return null;
          throw error;
        }
        return data.user ?? null;
      },
      async assurance() { return check(await client.auth.mfa.getAuthenticatorAssuranceLevel()).currentLevel; },
      async factors() { return check(await client.auth.mfa.listFactors()).totp.filter(x => x.status === 'verified').map(x => ({ id: x.id })); },
      async verify(factorId, code) { check(await client.auth.mfa.challengeAndVerify({ factorId, code })); },
      async gate() { return check(await client.rpc('staff_gate')); },
      async records() { return check(await client.rpc('staff_records_list')); },
      async createRecord(note) { return check(await client.rpc('staff_record_create', { p_note: note })); },
      async logout() { check(await client.auth.signOut({ scope: 'local' })); },
    };
  };
}
