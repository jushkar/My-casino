import { readFile } from 'node:fs/promises';
import { buildApp } from './app.js';
import { supabaseAuth } from './provider.js';
import { pgGateway } from './database.js';
import { tokenBox } from './token-box.js';
import { ownerProvider } from './owner-service.js';

if (process.env.NODE_ENV === 'production') throw Error('Owner integration is not verified for deployment');
// Product policy is approved; provider configuration, database grants, revocation
// bound, key custody and end-to-end verification are NOT approved/verified.
const OWNER_LIVE_SECURITY_VERIFIED = false;
let config = {};
if (OWNER_LIVE_SECURITY_VERIFIED) {
  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key, ALLOWED_ORIGIN: origin, CSRF_SECRET: csrfSecret,
    OWNER_DATABASE_URL: dbUrl, OWNER_TOKEN_KEY: tokenKey, OWNER_DATABASE_CA_FILE: caFile } = process.env;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url ?? '') || !key?.startsWith('sb_publishable_') || !/^https:\/\/[^/]+$/.test(origin ?? '') || !csrfSecret || Buffer.byteLength(csrfSecret) < 32 || !/^[a-f0-9]{64}$/.test(tokenKey ?? '')) throw Error('Owner configuration missing');
  const db = pgGateway(dbUrl, caFile ? await readFile(caFile, 'utf8') : undefined);
  config = { origin, csrfSecret, provider: ownerProvider({ db, auth: supabaseAuth({ url, key }), box: tokenBox(Buffer.from(tokenKey, 'hex')) }) };
}
const app = buildApp(config);
await app.listen({ host: '127.0.0.1', port: 3001 });
