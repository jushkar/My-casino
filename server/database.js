import pg from 'pg';

const statements = {
  begin: 'select mc_owner_private.gateway_begin($1,$2,$3::jsonb,$4)',
  lock: 'select mc_owner_private.gateway_lock($1) as value',
  save: 'select mc_owner_private.gateway_save($1,$2::jsonb,$3)',
  permit: 'select mc_owner_private.gateway_permit($1,$2::jsonb,$3,$4,$5) as value',
  close: 'select mc_owner_private.gateway_close($1) as value',
};
export function pgGateway(connectionString, ca) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || !/^mc_owner_gateway(?:\.[a-z0-9]+)?$/.test(decodeURIComponent(url.username))) {
    throw Error('Use the dedicated owner gateway role with explicit verified TLS');
  }
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 4, connectionTimeoutMillis: 5000, application_name: 'my-casino-owner' });
  pool.on('error', () => { process.stderr.write('Owner database connection unavailable\n'); });
  return {
    async transaction(fn) {
      const client = await pool.connect();
      let discard = false;
      try {
        await client.query('begin isolation level read committed');
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='5s'");
        await client.query("set local idle_in_transaction_session_timeout='20s'");
        // session_user cannot be changed through SET ROLE; reject a broad login.
        const { rows } = await client.query('select session_user as name');
        if (rows[0].name !== 'mc_owner_gateway') throw Error('Unexpected database principal');
        const tx = Object.fromEntries(Object.entries(statements).map(([name, sql]) => [name, async (...args) => (await client.query(sql, args)).rows[0]?.value]));
        const result = await fn(tx);
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback').catch(() => { discard = true; });
        throw error;
      } finally { client.release(discard); }
    },
    close: () => pool.end(),
  };
}
