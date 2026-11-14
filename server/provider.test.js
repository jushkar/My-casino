import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { supabaseProvider, noRefreshFetch, withinStaffWindow } from './provider.js';
import { buildApp } from './app.js';

// Real SDK against an isolated fake Auth/JWKS/Data API transport. Never live evidence.
const url='https://isolated-test.supabase.co';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'isolated-key',alg:'RS256',use:'sig'};
const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
const now=()=>Math.floor(Date.now()/1000);
const base=()=>({sub:uid,session_id:sid,role:'authenticated',aud:'authenticated',iss:url+'/auth/v1',aal:'aal2',iat:now(),exp:now()+3600,amr:[{method:'password',timestamp:now()-10}]});
function jwt(c) { const a=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid,typ:'JWT'})).toString('base64url');const b=Buffer.from(JSON.stringify(c)).toString('base64url');const data=a+'.'+b;return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url'); }
function harness({claims=base(),outage=false,logoutFailure=false,dbFailure=false,forged=false}={}) {
 const signed=jwt(claims), token=forged?signed.slice(0,-20)+'A'.repeat(20):signed, calls=[],cleared=[],written=[];
 const session={access_token:token,refresh_token:'ISOLATED_NOT_A_REAL_REFRESH_TOKEN',expires_at:claims.exp,expires_in:3600,token_type:'bearer',user:{id:uid}};
 const request={cookies:{'__Host-mc-auth':'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),'__Host-mc-staff':'a'.repeat(64),'__Host-mc-csrf':'b'.repeat(64)}};
 const reply={setCookie:(...x)=>written.push(x),clearCookie:(...x)=>cleared.push(x)};
 const fetchImpl=async(input,init)=>{
  const u=new URL(typeof input==='string'?input:input.url);calls.push(u.pathname);
  if(u.pathname.endsWith('/user')) {
   if(outage)return new Response('{}',{status:503});
   return Response.json({id:uid,factors:[]});
  }
  if(u.pathname.endsWith('/jwks.json'))return Response.json({keys:[jwk]});
  if(u.pathname.endsWith('/logout'))return new Response(null,{status:logoutFailure?503:204});
  if(u.pathname.endsWith('/staff_session_close'))return dbFailure?new Response('{}',{status:503}):Response.json('revoked');
  if(u.pathname.endsWith('/staff_session_open')||u.pathname.endsWith('/staff_gate'))return Response.json('allowed');
  throw Error('Unexpected isolated provider path');
 };
 return {api:supabaseProvider({url,key:'sb_publishable_ISOLATED_TEST_ONLY'},{fetchImpl})(request,reply),calls,cleared,written,fetchImpl};
}
test('isolated SDK verifies signature, online identity, issuer, MFA and password age',async()=>{
 const h=harness();assert.equal((await h.api.user()).id,uid);assert.equal(await h.api.assurance(),'aal2');assert(h.calls.includes('/auth/v1/user'));
 for(const claims of [ {...base(),iss:'https://attacker.test/auth/v1'}, {...base(),amr:[{method:'password',timestamp:now()-301}]}, {...base(),sub:sid} ]) {
  assert.equal(await harness({claims}).api.user(),null);
 }
 assert.equal(await harness({claims:{...base(),aal:'aal1'}}).api.assurance(),'aal1');
});
test('bounded signed-claims policy rejects expiry and missing/future primary auth',()=>{
 for(const c of [{...base(),exp:now()-1},{...base(),amr:[]},{...base(),amr:[{method:'totp',timestamp:now()}]},{...base(),amr:[{method:'password',timestamp:now()+10}]}])assert.equal(withinStaffWindow(c,uid,url),false);
});
test('refresh is blocked before network, including concurrently with durable logout',async()=>{
 const h=harness();let refreshCalls=0;
 const blocked=noRefreshFetch(url,async()=>{refreshCalls++;throw Error('must not call');});
 const [r,l]=await Promise.all([blocked(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST'}),h.api.logout()]);
 assert.equal(r.status,401);assert.equal(refreshCalls,0);assert.equal(l.appRevoked,true);
 assert(h.calls.indexOf('/rest/v1/rpc/staff_session_close')<h.calls.indexOf('/auth/v1/logout'));
 assert(h.cleared.some(x=>x[0]==='__Host-mc-staff'));assert(h.cleared.every(x=>x[1].secure&&x[1].httpOnly&&x[1].path==='/'));
});
test('Auth outage fails closed; logout reports provider uncertainty after local revocation',async()=>{
 await assert.rejects(harness({outage:true}).api.user());
 const r=await harness({logoutFailure:true}).api.logout();assert.equal(r.appRevoked,true);assert.equal(r.providerLogout,'unconfirmed');
 const failed=harness({dbFailure:true});await assert.rejects(failed.api.logout());assert(!failed.calls.includes('/auth/v1/logout'));
});
test('capability is freshly random, HttpOnly/Secure, and issued only after session registration',async()=>{
 const h=harness();await h.api.open();const c=h.written.find(x=>x[0]==='__Host-mc-staff');assert.match(c[1],/^[a-f0-9]{64}$/);assert.notEqual(c[1],'a'.repeat(64));assert.equal(c[2].maxAge,300);assert(c[2].secure&&c[2].httpOnly);
});

test('isolated SDK denies forged signatures, expired tokens and AAL1 capability issuance',async()=>{
 const forged=harness({forged:true});assert.equal(await forged.api.user(),null);
 const expired=harness({claims:{...base(),exp:now()-60}});
 assert.equal(await expired.api.user(),null);assert(!expired.calls.some(x=>x.endsWith('/token')));
 const aal1=harness({claims:{...base(),aal:'aal1'}});await assert.rejects(aal1.api.open(),{statusCode:403});assert(!aal1.written.some(x=>x[0]==='__Host-mc-staff'));
});

test('real SDK transport failures map to generic HTTP responses in isolated Fastify',async()=>{
 for(const [options,status] of [[{outage:true},503],[{claims:{...base(),exp:now()-60}},401],[{claims:{...base(),aal:'aal1'}},403],[{forged:true},401]]) {
  const h=harness(options),app=buildApp({provider:()=>h.api,origin:'https://staff.example.test',csrfSecret:'ISOLATED_TEST_ONLY_NOT_A_REAL_SECRET'});
  try {
   const response=await app.inject({url:'/api/staff/records'});
   assert.equal(response.statusCode,status);
   assert(!response.body.includes('AuthApiError'));assert(!response.body.includes('stack'));assert(!response.body.includes('refresh_token'));
  } finally {await app.close();}
 }
});
