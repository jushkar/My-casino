import { buildApp } from './app.js';
import { supabaseProvider } from './provider.js';

// Never expose this unverified development service. Production startup is deliberately disabled.
if (process.env.NODE_ENV === 'production') throw new Error('Staff integration is not yet verified for deployment');
const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key, ALLOWED_ORIGIN: origin, CSRF_SECRET: secret } = process.env;
// Pending explicit owner acceptance of ADR-002 and live verification.
const OWNER_APPROVED_REDESIGN = false;
const valid = OWNER_APPROVED_REDESIGN && url && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && key?.startsWith('sb_publishable_') && origin && /^https:\/\/[^/]+$/.test(origin) && secret && Buffer.byteLength(secret) >= 32;
const app = buildApp(valid ? { provider: supabaseProvider({ url, key }), origin, csrfSecret: secret } : {});
await app.listen({ host: '127.0.0.1', port: 3001 });
