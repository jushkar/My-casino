import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';
const origin = 'https://owner.example.test';
const fail = statusCode => Object.assign(Error('private upstream detail'), { statusCode });
// Explicit isolated fake service. Production has no authentication mock switch.
function fixture() {
  const revoked = new Set(); let calls = 0;
  const provider = (req, reply) => {
    const session = req.cookies['__Host-mc-owner'];
    const check = () => {
      calls++;
      if (!session || ['expired','revoked'].includes(session) || revoked.has(session)) throw fail(401);
      if (['nonowner','aal1','disabled'].includes(session)) throw fail(403);
      if (['auth-outage','db-outage'].includes(session)) throw fail(503);
    };
    return {
      async run(action, note) { check(); return action === 'records.read' ? { records: [{ note: 'Isolated owner record' }] } : { record: note }; },
      async login(email) { if (email === 'nonowner@example.test') throw fail(403); reply.setCookie('__Host-mc-owner','owner',{path:'/',secure:true,httpOnly:true,sameSite:'lax'}); },
      async factors() { check(); return { factors: [] }; },
      async mfa() { check(); return { ok: true }; },
      async logout() { if (!session) throw fail(401); revoked.add(session); reply.clearCookie('__Host-mc-owner',{path:'/',secure:true,httpOnly:true}); return {appRevoked:true,providerLogout:'unconfirmed'}; },
    };
  };
  return { app: buildApp({ provider, origin, csrfSecret: 'ISOLATED_CSRF_SECRET_FOR_TEST_ONLY' }), calls: () => calls };
}
const cookie = value => value ? `__Host-mc-owner=${value}` : '';
async function state(app, value='owner') {
  const r=await app.inject({url:'/api/owner/auth/csrf',headers:{cookie:cookie(value)}});
  assert.equal(r.statusCode,200);
  return {cookie:[cookie(value),r.headers['set-cookie'].split(';')[0]].filter(Boolean).join('; '),token:r.json().token};
}
const post = (app,url,s,payload={}) => app.inject({method:'POST',url,headers:{origin,'content-type':'application/json',cookie:s.cookie,'x-csrf-token':s.token},payload});

test('isolated owner routes enforce anonymous 401, nonowner/AAL1/disabled 403 and owner access',async()=>{
 const {app}=fixture();try{
  for(const path of ['/owner','/owner/panel.js','/api/owner/session','/api/owner/records']){
   for(const [identity,status] of [['',401],['nonowner',403],['aal1',403],['disabled',403],['expired',401],['revoked',401],['owner',200]]){
    const r=await app.inject({url:path,headers:{cookie:cookie(identity),'x-role':'owner',authorization:'Bearer FORGED_ISOLATED_VALUE'}});
    assert.equal(r.statusCode,status);if(status!==200)assert(!r.body.includes('Isolated owner record'));
   }
  }
  assert.equal((await app.inject({url:'/staff'})).statusCode,404);
  assert.equal((await app.inject({url:'/admin'})).statusCode,404); // Public HashRouter owns /#/admin, never Fastify.
 }finally{await app.close();}
});
test('isolated exact Origin, CSRF binding, content type and CORS denial',async()=>{
 const {app}=fixture();try{
  const s=await state(app);
  for(const headers of [
   {cookie:s.cookie,'content-type':'application/json'},
   {cookie:s.cookie,'content-type':'application/json',origin:'https://attacker.test','x-csrf-token':s.token},
   {cookie:s.cookie,'content-type':'application/json',origin,'x-csrf-token':'0'.repeat(64)},
   {cookie:s.cookie.replace('owner=owner','owner=nonowner'),'content-type':'application/json',origin,'x-csrf-token':s.token},
   {cookie:s.cookie,'content-type':'text/plain',origin,'x-csrf-token':s.token},
  ])assert.equal((await app.inject({method:'POST',url:'/api/owner/records',headers,payload:'{"note":"demo"}'})).statusCode,403);
  const preflight=await app.inject({method:'OPTIONS',url:'/api/owner/records',headers:{origin:'https://attacker.test'}});
  assert.equal(preflight.statusCode,404);assert(!preflight.headers['access-control-allow-origin']);
  assert.equal((await post(app,'/api/owner/records',s,{note:'demo'})).statusCode,200);
 }finally{await app.close();}
});
test('isolated writes retain identity/MFA checks with valid CSRF; malformed notes never reach service',async()=>{
 const {app,calls}=fixture();try{
  for(const [who,status] of [['',401],['nonowner',403],['aal1',403],['expired',401]])assert.equal((await post(app,'/api/owner/records',await state(app,who),{note:'demo'})).statusCode,status);
  const before=calls();assert.equal((await post(app,'/api/owner/records',await state(app),{note:'\n'})).statusCode,400);assert.equal(calls(),before);
 }finally{await app.close();}
});
test('isolated logout revokes old app cookie and distinguishes provider uncertainty',async()=>{
 const {app}=fixture();try{
  const r=await post(app,'/api/owner/auth/logout',await state(app));assert.equal(r.statusCode,200);assert.equal(r.json().appRevoked,true);assert.equal(r.json().providerLogout,'unconfirmed');
  assert.match(r.headers['set-cookie'],/Max-Age=0/);assert.equal((await app.inject({url:'/owner',headers:{cookie:cookie('owner')}})).statusCode,401);
 }finally{await app.close();}
});
test('isolated Auth/DB outage and disabled startup return safe 503',async()=>{
 const {app}=fixture(),closed=buildApp();try{
  for(const who of ['auth-outage','db-outage']){const r=await app.inject({url:'/api/owner/records',headers:{cookie:cookie(who)}});assert.equal(r.statusCode,503);assert(!r.body.includes('private upstream detail'));}
  for(const url of ['/owner','/owner/login','/api/owner/records'])assert.equal((await closed.inject({url})).statusCode,503);
 }finally{await app.close();await closed.close();}
});
test('isolated rate limiting, no owner enrollment/reassignment routes',async()=>{
 const {app}=fixture();try{
  const s=await state(app,'');for(let i=0;i<5;i++)assert.equal((await post(app,'/api/owner/auth/login',s,{email:'owner@example.test',password:'ISOLATED_TEST_INPUT'})).statusCode,200);
  assert.equal((await post(app,'/api/owner/auth/login',s,{email:'owner@example.test',password:'ISOLATED_TEST_INPUT'})).statusCode,429);
  for(const url of ['/api/owner/signup','/api/owner/provision','/api/owner/invite','/api/owner/reassign'])assert.equal((await post(app,url,s)).statusCode,404);
 }finally{await app.close();}
});
