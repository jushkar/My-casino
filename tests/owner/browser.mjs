import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { buildApp } from '../../server/app.js';
const require=createRequire(import.meta.url);
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='docs/evidence/prompt-03/owner-refactor/browser';await mkdir(out,{recursive:true});
// UI behavior only: deliberately fake owner service, no provider/SQL evidence.
const state={expired:false,outage:false,stepup:false,records:[]};
const capability='a'.repeat(64),factorId='33333333-3333-4333-8333-333333333333';
const dates=()=>({idleExpiresAt:new Date(Date.now()+1800000).toISOString(),absoluteExpiresAt:new Date(Date.now()+28800000).toISOString()});
const options={path:'/',secure:true,httpOnly:true,sameSite:'lax'};
const provider=(req,reply)=>({
 async login(){reply.setCookie('__Host-mc-owner',capability,options);},
 async factors(){return {factors:[{id:factorId}]};},
 async mfa(){state.stepup=false;return dates();},
 async run(action,note){
  if(req.cookies['__Host-mc-owner']!==capability||state.expired)throw Object.assign(Error(),{statusCode:401});
  if(state.outage)throw Error('isolated outage');
  if(action==='record.create'){if(state.stepup)throw Object.assign(Error(),{code:'P0004'});state.records.push({note});}
  return {...dates(),records:state.records};
 },
 async logout(){reply.clearCookie('__Host-mc-owner',options);return {appRevoked:true,providerLogout:'unconfirmed'};},
});
const app=buildApp({provider,origin:'http://localhost:3004',csrfSecret:'ISOLATED_BROWSER_CSRF_VALUE_NOT_REAL'});
const closed=buildApp();
await app.listen({host:'127.0.0.1',port:3004});await closed.listen({host:'127.0.0.1',port:3005});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 let r=await page.goto('http://localhost:3004/owner');assert.equal(r.status(),401);
 await page.goto('http://localhost:3004/owner/login');
 await page.locator('input[name=email]').fill('owner@example.test');await page.locator('input[name=password]').fill('ISOLATED_UI_INPUT');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#mfa').waitFor({state:'visible'});
 await page.locator('#mfa input').fill('000000');await page.getByRole('button',{name:'Verify',exact:true}).click();await page.waitForURL('**/owner');
 await page.getByRole('heading',{name:'Owner foundation'}).waitFor();await page.screenshot({path:out+'/owner-panel.png'});
 const cookies=await page.context().cookies();assert(cookies.find(c=>c.name==='__Host-mc-owner').httpOnly);assert(cookies.find(c=>c.name==='__Host-mc-owner').secure);
 assert(!(await page.evaluate(()=>document.cookie)).includes('__Host-mc-owner='));
 const draft='Unsaved isolated owner note';await page.locator('#record input').fill(draft);state.expired=true;
 await page.getByRole('button',{name:'Save note'}).click();await page.locator('#signin').waitFor({state:'visible'});assert.equal(await page.locator('#record input').inputValue(),draft);
 assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);await page.screenshot({path:out+'/owner-expired-draft.png'});
 state.expired=false;await page.getByRole('button',{name:'Refresh access'}).click();await page.getByText(/Access restored/).waitFor();assert.equal(await page.locator('#record input').inputValue(),draft);
 state.stepup=true;await page.getByRole('button',{name:'Save note'}).click();await page.locator('#stepup').waitFor({state:'visible'});
 await page.locator('#stepup input').fill('000000');await page.getByRole('button',{name:'Verify code'}).click();await page.getByText(/Review your note and choose/).waitFor();assert.equal(state.records.length,0);
 await page.getByRole('button',{name:'Save note'}).click();await page.getByText('Note saved.',{exact:true}).waitFor();assert.equal(state.records.length,1);
 await page.locator('#record input').fill('Retained during outage');state.outage=true;await page.getByRole('button',{name:'Refresh access'}).click();await page.getByText('Owner service unavailable',{exact:true}).waitFor();assert.equal(await page.locator('#record input').inputValue(),'Retained during outage');state.outage=false;
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/owner/login');
 console.log('PASS isolated browser owner entry, HttpOnly/Secure localhost cookie, expiry draft preservation without browser storage, MFA step-up/manual retry, outage and logout. Provider service is FAKE. HTTPS/Safari not tested.');
 r=await page.goto('http://127.0.0.1:3005/owner');assert.equal(r.status(),503);assert(!(await page.content()).includes('Owner foundation'));await page.screenshot({path:out+'/owner-disabled.png'});
 console.log('PASS /owner returns 503 when normal service configuration is disabled.');
 await page.goto('http://127.0.0.1:4173/#/admin');await page.getByRole('button',{name:'All Games (9)',exact:true}).first().waitFor();
 assert(!(await page.content()).includes('Owner foundation'));await page.screenshot({path:out+'/public-admin-lobby-fallback.png'});
 const lobbyHeading='My Casino Originals & Table Games';await page.getByRole('heading',{name:lobbyHeading,exact:true}).waitFor();
 for(const game of ['crash','dice','mines','roulette','blackjack','baccarat','plinko','keno','wheel'])assert(await page.locator(`a[href="#/${game}"]`).count()>0);
 await page.goto('http://127.0.0.1:4173/#/');await page.getByRole('heading',{name:lobbyHeading,exact:true}).waitFor();await page.getByRole('button',{name:'All Games (9)',exact:true}).waitFor();
 console.log('PASS accepted /#/admin fallback matches the public lobby. Legacy House Controls source remains unrouted/unchanged; this routing was explicitly confirmed by the owner. /owner is separate.');
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();await app.close();await closed.close();}
