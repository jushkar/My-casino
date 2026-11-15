import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { supabaseAuth, validClaims } from './provider.js';
import { tokenBox } from './token-box.js';
import { ownerProvider } from './owner-service.js';
import { buildApp } from './app.js';
import { pgGateway } from './database.js';

// Installed SDK, ephemeral signing/encryption keys and isolated fake Auth/Data
// transport. No provider identity, TOTP verification or live PostgREST is claimed.
const url='https://isolated-test.supabase.co',uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',factor='33333333-3333-4333-8333-333333333333';
const now=()=>Math.floor(Date.now()/1000);
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'isolated-owner-key',alg:'RS256',use:'sig'};
const base=()=>({sub:uid,session_id:sid,role:'authenticated',aud:'authenticated',iss:url+'/auth/v1',aal:'aal2',iat:now()-1,exp:now()+299,amr:[{method:'password',timestamp:now()-20},{method:'totp',timestamp:now()-10}]});
function jwt(c,forged=false){const h=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:jwk.kid})).toString('base64url'),p=Buffer.from(JSON.stringify(c)).toString('base64url'),v=h+'.'+p;return v+'.'+(forged?'A'.repeat(342):sign('RSA-SHA256',Buffer.from(v),privateKey).toString('base64url'));}
function network({claims=base(),forged=false}={}){
 const flags={outage:false,dbOutage:false,logoutFailure:false,externalRevoked:false,rejected:false},calls=[];
 let refreshed=0,rpcHook;
 const tokens=()=>({access_token:jwt(claims,forged),refresh_token:'ISOLATED_REFRESH_TOKEN_'+refreshed});
 const response=()=>({...tokens(),user:{id:uid},expires_in:Math.max(0,claims.exp-now()),token_type:'bearer'});
 const fetchImpl=async(input,init)=>{
  const u=new URL(typeof input==='string'?input:input.url);calls.push(u.pathname+(u.pathname.endsWith('/token')?u.search:''));
  if(u.pathname.endsWith('/token')){
   if(flags.outage)return Response.json({},{status:503});
   if(u.searchParams.get('grant_type')==='refresh_token'){
    if(flags.externalRevoked)return Response.json({msg:'isolated revoked refresh'},{status:401});
    refreshed++;claims={...claims,iat:now()-1,exp:now()+299};
   }else claims={...claims,aal:'aal1',amr:claims.amr.filter(x=>x.method==='password')};
   return Response.json(response());
  }
  if(u.pathname.endsWith('/user'))return flags.outage?Response.json({},{status:503}):flags.rejected?Response.json({msg:'isolated identity rejected'},{status:401}):Response.json({id:uid,factors:[{id:factor,factor_type:'totp',status:'verified'}]});
  if(u.pathname.endsWith('/jwks.json'))return Response.json({keys:[jwk]});
  if(u.pathname.endsWith('/challenge'))return Response.json({id:factor,type:'totp',expires_at:now()+300});
  if(u.pathname.endsWith('/verify')){claims={...claims,aal:'aal2',amr:[...claims.amr.filter(x=>x.method==='password'),{method:'totp',timestamp:now()}]};return Response.json(response());}
  if(u.pathname.endsWith('/logout'))return new Response(null,{status:flags.logoutFailure?503:204});
  if(u.pathname.endsWith('/owner_action')){
   if(flags.dbOutage)return Response.json({code:'08006',message:'isolated DB failure'},{status:503});
   return rpcHook?rpcHook(JSON.parse(init.body)):Response.json({ok:true});
  }
  throw Error('Unexpected isolated provider path');
 };
 return {auth:supabaseAuth({url,key:'sb_publishable_ISOLATED_TEST_ONLY'},{fetchImpl}),flags,calls,tokens,refreshCount:()=>refreshed,setRpc:fn=>{rpcHook=fn;}};
}
function repository(){
 let rows=new Map(),permits=new Map(),tail=Promise.resolve(),minted=0;
 const flags={outage:false,enabled:true,owner:uid};
 const error=code=>Object.assign(Error('isolated database rejection'),{code});
 const row=cap=>{const r=rows.get(cap);if(!r||r.revoked)throw error('28000');if(!flags.enabled)throw error('42501');return r;};
 const api={
  flags,rows:()=>rows,minted:()=>minted,
  async transaction(fn){
   const prior=tail;let unlock;tail=new Promise(r=>{unlock=r;});await prior;
   const savedRows=structuredClone(rows),savedPermits=structuredClone(permits);
   try{
    if(flags.outage)throw error('08006');
    return await fn({
     async begin(id,cap,c,box){if(c.sub!==flags.owner||!flags.enabled)throw error('42501');if([...rows.values()].some(r=>r.sid===c.session_id))throw error('23505');rows.set(cap,{id,sid:c.session_id,token_box:box,activated_at:null,revoked:false});},
     async lock(cap){return structuredClone(row(cap));},
     async save(cap,_c,box){row(cap).token_box=box;},
     async permit(cap,c,action,hash,nonce){const r=row(cap);minted++;permits.set(nonce,{id:r.id,cap,c,action,hash,used:false});return r.id;},
     async close(cap){const r=rows.get(cap);if(!r)throw error('28000');const old=structuredClone(r);r.revoked=true;r.token_box='revoked';return old;},
    });
   }catch(e){rows=savedRows;permits=savedPermits;throw e;}finally{unlock();}
  },
  rpc(args){const p=permits.get(args.p_permit),r=p&&rows.get(p.cap);if(!p||p.used||!r||r.revoked)return Response.json({code:'28000',message:'isolated deny'},{status:401});p.used=true;if(args.p_action==='enter')r.activated_at='isolated-active';return Response.json({records:[],idleExpiresAt:new Date(Date.now()+1800000).toISOString(),absoluteExpiresAt:new Date(Date.now()+28800000).toISOString()});},
 };
 return api;
}
function service(net=network(),db=repository()){
 const box=tokenBox(randomBytes(32)),cookies={},written=[],cleared=[];
 const reply={setCookie:(name,value,options)=>{cookies[name]=value;written.push({name,value,options});},clearCookie:(name,options)=>{delete cookies[name];cleared.push({name,options});}};
 net.setRpc(args=>db.rpc(args));
 const provider=ownerProvider({db,auth:net.auth,box});
 return {net,db,box,cookies,written,cleared,provider,client:()=>provider({cookies:{...cookies}},reply)};
}

test('installed SDK verifies signature, subject, issuer and bounded provider TTL',async()=>{
 const n=network();assert.equal((await (await n.auth.resume(n.tokens())).verified()).claims.aal,'aal2');assert(n.calls.includes('/auth/v1/user'));
 for(const options of [{forged:true},{claims:{...base(),iss:'https://attacker.test/auth/v1'}},{claims:{...base(),sub:sid}},{claims:{...base(),exp:now()+3600}}]){
  const n=network(options);await assert.rejects(async()=> (await n.auth.resume(n.tokens())).verified(),{statusCode:401});
 }
 assert.equal(validClaims({...base(),amr:[]},uid,url),false);
});
test('token encryption authenticates session identity and rejects tampering',()=>{
 const box=tokenBox(randomBytes(32)),tokens={access_token:'ISOLATED_ACCESS_TOKEN',refresh_token:'ISOLATED_REFRESH_TOKEN'};
 const sealed=box.seal(tokens,sid);assert(!sealed.includes('ISOLATED_ACCESS_TOKEN'));assert.deepEqual(box.open(sealed,sid),tokens);
 assert.throws(()=>box.open(sealed,uid));assert.throws(()=>box.open(sealed.slice(0,-8)+'AAAAAAAA',sid));
 assert.notEqual(box.seal(tokens,sid),sealed);assert.throws(()=>tokenBox(Buffer.alloc(16)));
});
test('owner login stores only opaque cookie, encrypted tokens, then SDK MFA opens entry',async()=>{
 const h=service();await h.client().login('owner@example.test','ISOLATED_INPUT_NOT_A_REAL_PASSWORD');
 const c=h.written[0];assert.equal(c.name,'__Host-mc-owner');assert.match(c.value,/^[a-f0-9]{64}$/);assert(c.options.secure&&c.options.httpOnly&&c.options.path==='/');assert.equal(c.options.maxAge,28800);
 assert.equal(h.db.minted(),0);assert.equal((await h.client().factors()).factors[0].id,factor);
 await assert.rejects(h.client().run('status'),{statusCode:403});
 await h.client().mfa(factor,'000000');await h.client().run('status');assert.equal(h.db.minted(),2);
 assert(!JSON.stringify(h.written).includes('access_token'));
});
test('non-owner login and missing opaque cookie cannot mint permits',async()=>{
 const db=repository();db.flags.owner=sid;const h=service(network(),db);
 await assert.rejects(h.client().login('nonowner@example.test','ISOLATED_INPUT'),{code:'42501'});assert.equal(h.written.length,0);assert.equal(db.minted(),0);
 await assert.rejects(h.client().run('status'),{statusCode:401});
});
test('online Auth and database outages issue no new BFF permits',async()=>{
 const h=service();await h.client().login('owner@example.test','ISOLATED_INPUT');await h.client().mfa(factor,'000000');
 const count=h.db.minted();h.net.flags.outage=true;await assert.rejects(h.client().run('status'));assert.equal(h.db.minted(),count);
 h.net.flags.outage=false;h.db.flags.outage=true;await assert.rejects(h.client().run('status'));assert.equal(h.db.minted(),count);
});
test('SDK refresh is serialized across concurrent requests and durable logout',async()=>{
 const n=network({claims:{...base(),exp:now()-10,iat:now()-310}}),db=repository(),h=service(n,db);
 const cap=randomBytes(32).toString('hex');h.cookies['__Host-mc-owner']=cap;
 db.rows().set(cap,{id:sid,sid,token_box:h.box.seal(n.tokens(),sid),activated_at:'active',revoked:false});
 const results=await Promise.allSettled([h.client().run('status'),h.client().run('status'),h.client().logout()]);
 assert.equal(n.refreshCount(),1);assert.equal(results[2].status,'fulfilled');assert.equal(results[2].value.appRevoked,true);
 assert(db.rows().get(cap).revoked);h.cookies['__Host-mc-owner']=cap;await assert.rejects(h.client().run('status'),{code:'28000'});
 assert.equal(n.refreshCount(),1);assert(h.cleared.some(x=>x.name==='__Host-mc-owner'));
});
test('external logout is not inferred from getUser; expired revoked refresh denies renewal',async()=>{
 const current=network();current.flags.externalRevoked=true;
 assert.equal((await (await current.auth.resume(current.tokens())).verified()).claims.sub,uid); // Explicit residual, not immediate revocation proof.
 const expired=network({claims:{...base(),iat:now()-310,exp:now()-10}});expired.flags.externalRevoked=true;
 await assert.rejects(expired.auth.resume(expired.tokens()),{statusCode:401});
});
test('application close commits before uncertain provider logout; DB failure does not claim success',async()=>{
 const h=service();await h.client().login('owner@example.test','ISOLATED_INPUT');h.net.flags.logoutFailure=true;
 const r=await h.client().logout();assert.equal(r.appRevoked,true);assert.equal(r.providerLogout,'unconfirmed');assert([...h.db.rows().values()].every(x=>x.revoked));
 const k=service();await k.client().login('owner@example.test','ISOLATED_INPUT');k.db.flags.outage=true;
 const before=k.net.calls.filter(x=>x.endsWith('/logout')).length;await assert.rejects(k.client().logout());assert.equal(k.net.calls.filter(x=>x.endsWith('/logout')).length,before);assert.equal(k.cleared.length,0);
});
test('real service maps fake Auth/DB failures to generic HTTP responses without material leakage',async()=>{
 for(const kind of ['auth','database']){
  const h=service();await h.client().login('owner@example.test','ISOLATED_INPUT');await h.client().mfa(factor,'000000');
  if(kind==='auth')h.net.flags.outage=true;else h.db.flags.outage=true;
  const app=buildApp({provider:h.provider,origin:'https://owner.example.test',csrfSecret:'ISOLATED_TEST_ONLY_CSRF_VALUE'});
  try{const r=await app.inject({url:'/api/owner/records',headers:{cookie:'__Host-mc-owner='+h.cookies['__Host-mc-owner']}});assert.equal(r.statusCode,503);assert.deepEqual(r.json(),{error:'Owner service unavailable'});}finally{await app.close();}
 }
});

test('gateway configuration rejects broad roles and URI overrides before connecting',()=>{
 for(const value of ['postgresql://postgres@db.example.test/postgres','postgresql://service_role@db.example.test/postgres','postgresql://mc_owner_gateway@db.example.test/postgres?sslmode=disable','postgresql://mc_owner_gateway@db.example.test/postgres?user=postgres','https://mc_owner_gateway@db.example.test/postgres'])assert.throws(()=>pgGateway(value));
});

test('observed Auth rejection durably retires the app session; later provider recovery cannot reopen it',async()=>{
 const h=service();await h.client().login('owner@example.test','ISOLATED_INPUT');await h.client().mfa(factor,'000000');
 h.net.flags.rejected=true;await assert.rejects(h.client().run('status'),{statusCode:401});
 assert([...h.db.rows().values()].every(row=>row.revoked&&row.token_box==='revoked'));
 h.net.flags.rejected=false;await assert.rejects(h.client().run('status'),{code:'28000'});
});
