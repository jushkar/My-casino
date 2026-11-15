// Local TLS/pg-driver + real SQL grants test. Auth/PostgREST claims are simulated.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { pgGateway } from '../../server/database.js';
const ca=await readFile('/tmp/my-casino-owner-wire/cert.pem','utf8');
const url='postgresql://mc_owner_gateway@127.0.0.1:65437/postgres';
const admin=new pg.Pool({connectionString:'postgresql://postgres@127.0.0.1:65437/postgres',ssl:{ca,rejectUnauthorized:true}});
const db=pgGateway(url,ca),raw=new pg.Pool({connectionString:url,ssl:{ca,rejectUnauthorized:true}});
const uid=randomUUID(),sid=randomUUID(),id=randomUUID(),cap=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex');
const now=Math.floor(Date.now()/1000),claims={sub:uid,session_id:sid,role:'authenticated',aud:'authenticated',aal:'aal2',iss:'https://isolated-test.supabase.co/auth/v1',iat:now-1,exp:now+299,amr:[{method:'password',timestamp:now-20},{method:'totp',timestamp:now-10}]};
try{
 await admin.query("create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role mc_migrator nologin createrole;grant create on database postgres to mc_migrator;grant create,usage on schema public to mc_migrator with grant option");
 const client=await admin.connect();
 try{
  await client.query('set role mc_migrator');await client.query(await readFile('supabase/migrations/20261113231743_staff_foundation.sql','utf8'));await client.query('reset role');
  // Only the disposable fixture enables LOGIN. Migration itself stays NOLOGIN.
  await client.query('alter role mc_owner_gateway login');await client.query('set role mc_owner_operator');
  await client.query("select mc_owner_private.provision_owner($1,'isolated approval','local TLS fixture only')",[uid]);await client.query('reset role');
 }finally{client.release();}
 assert.equal((await raw.query('select session_user as name')).rows[0].name,'mc_owner_gateway');
 assert.equal((await raw.query('select ssl from pg_stat_ssl where pid=pg_backend_pid()')).rows[0].ssl,true);
 console.log('PASS real node-postgres connection, verified local TLS certificate and mc_owner_gateway session_user. Fixture host auth is local trust; production SCRAM/provider credentials NOT tested.');
 const untrusted=pgGateway(url);try{await assert.rejects(untrusted.transaction(()=>{}));}finally{await untrusted.close();}
 console.log('PASS untrusted TLS certificate rejected; no rejectUnauthorized:false option.');
 await assert.rejects(db.transaction(async tx=>{await tx.begin(id,cap,claims,'isolated-encrypted-fixture');throw Error('rollback fixture');}));
 await assert.rejects(db.transaction(tx=>tx.lock(cap)),{code:'28000'});
 await db.transaction(tx=>tx.begin(id,cap,claims,'isolated-encrypted-fixture'));
 await db.transaction(async tx=>{const row=await tx.lock(cap);assert.equal(row.id,id);await tx.save(cap,claims,'rotated-encrypted-fixture');assert.equal(await tx.permit(cap,claims,'enter',createHash('sha256').update('').digest('hex'),nonce),id);});
 assert.equal((await db.transaction(tx=>tx.lock(cap))).token_box,'rotated-encrypted-fixture');
 console.log('PASS real gateway transactions, rollback, encrypted fixture persistence, row lock and permit issuance.');
 for(const q of ['select * from mc_owner_private.binding','select * from mc_owner_private.records','set role authenticated','set role mc_owner_executor','set role mc_owner_operator',"select public.owner_action(null,null,'status',null)"]){await assert.rejects(raw.query(q),{code:'42501'});}
 console.log('PASS gateway cannot read private authority/data, assume user/executor/operator roles, or execute owner RPC directly.');
 const rpc=await admin.connect();
 try{await rpc.query('begin');await rpc.query('set local role authenticated');await rpc.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);await rpc.query("select public.owner_action($1,$2,'enter',null)",[id,nonce]);await rpc.query('commit');}finally{rpc.release();}
 await db.transaction(tx=>tx.close(cap));await assert.rejects(db.transaction(tx=>tx.lock(cap)),{code:'28000'});
 console.log('PASS simulated PostgREST role consumed permit; real gateway logout persists and rejects reuse. No real Supabase Auth or Data API verification.');
}finally{await db.close();await raw.end();await admin.end();}
