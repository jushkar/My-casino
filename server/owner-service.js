import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { authRequired } from './provider.js';

export const ownerCookie = '__Host-mc-owner';
export const cookieOptions = { path: '/', secure: true, httpOnly: true, sameSite: 'lax' };
const hash = text => createHash('sha256').update(text).digest('hex');
const denied = () => Object.assign(Error('Access denied'), { statusCode: 403 });

export function ownerProvider({ db, auth, box }) {
  return (request, reply) => {
    const cap = () => {
      const value = request.cookies[ownerCookie];
      if (!value || !/^[a-f0-9]{64}$/.test(value)) throw authRequired();
      return value;
    };
    async function prepare(action, note = '', challenge) {
      const capability = cap();
      try { return await db.transaction(async tx => {
        const row = await tx.lock(capability);
        const client = await auth.resume(box.open(row.token_box, row.id));
        let verified = await client.verified(); // Always online getUser + verified claims.
        if (challenge) {
          await client.challenge(challenge.factorId, challenge.code);
          verified = await client.verified();
          action = row.activated_at ? 'stepup' : 'enter';
        }
        await tx.save(capability, verified.claims, box.seal(verified.tokens, row.id));
        if (!action) return { factors: await client.factors() };
        if (verified.claims.aal !== 'aal2') throw denied();
        const nonce = randomBytes(32).toString('hex');
        const id = await tx.permit(capability, verified.claims, action, hash(note), nonce);
        return { accessToken: verified.tokens.access_token, args: { p_session: id, p_permit: nonce, p_action: action, p_note: note || null } };
      }); } catch (error) {
        // Once invalid identity/expiry is observed, retire the app session too.
        // Infrastructure errors do not masquerade as logout or renew activity.
        if (error.statusCode === 401 || error.code === '28000') {
          await db.transaction(tx => tx.close(capability)).catch(() => {});
        }
        throw error;
      }
    }
    async function run(action, note = '', challenge) {
      const prepared = await prepare(action, note, challenge);
      return auth.rpc(prepared.accessToken, prepared.args);
    }
    return {
      async login(email, password) {
        const client = await auth.login(email, password), verified = await client.verified();
        const id = randomUUID(), capability = randomBytes(32).toString('hex');
        try {
          await db.transaction(tx => tx.begin(id, capability, verified.claims, box.seal(verified.tokens, id)));
        } catch (error) {
          await auth.logout(verified.tokens.access_token).catch(() => {});
          throw error;
        }
        reply.setCookie(ownerCookie, capability, { ...cookieOptions, maxAge: 8 * 60 * 60 });
      },
      async factors() { return prepare(null); },
      async mfa(factorId, code) { return run(null, '', { factorId, code }); },
      run,
      async logout() {
        // Local invalidation commits before the external provider operation.
        const old = await db.transaction(tx => tx.close(cap()));
        let providerLogout = 'unconfirmed';
        try {
          const tokens = box.open(old.token_box, old.id);
          await auth.logout(tokens.access_token);
          providerLogout = 'sdk-success';
        } catch { /* Never claim provider revocation when it was not confirmed. */ }
        reply.clearCookie(ownerCookie, cookieOptions);
        reply.clearCookie('__Host-mc-owner-csrf', { ...cookieOptions, sameSite: 'strict' });
        return { appRevoked: true, providerLogout };
      },
    };
  };
}
