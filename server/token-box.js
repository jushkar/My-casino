import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Encryption at rest for provider bearer material, not an identity mechanism.
// Key is supplied outside source control and is separate from DB/CSRF secrets.
export function tokenBox(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error('Owner token key must be 32 bytes');
  return {
    seal(session, id) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(`my-casino-owner:v1:${id}`));
      const body = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
      return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
    },
    open(value, id) {
      const [version, iv, tag, body, extra] = value.split('.');
      if (version !== 'v1' || extra !== undefined || !body) throw Error('Invalid owner token envelope');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      decipher.setAAD(Buffer.from(`my-casino-owner:v1:${id}`));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8'));
    },
  };
}
