import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdir} from 'node:fs/promises';
import {adminPage} from '../ui-admin.mjs';
import {playerPage} from '../ui-player.mjs';
import {cutoffFor} from '../schedule.mjs';
for(const [market,hour] of [['2D','11'],['3D','12'],['4D','13']])assert.equal(cutoffFor('2026-10-03',market).toISOString(),`2026-10-03T${hour}:30:00.000Z`);
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let backendTime=Date.parse('2026-10-03T10:00:00Z');
let draws=['2D','3D','4D'].map((market,i)=>({id:i+1,day:'2026-10-03',market,cutoff:cutoffFor('2026-10-03',market).toISOString(),multiplier:[80,650,6000][i],status:'open',result:null,source:null,settled_at:null}));
const state=()=>({account:{username:'futurecode',balance:125000,daily_limit:100000,excluded_until:null},day:'2026-10-03',server_time:new Date(backendTime).toISOString(),draws,bets:[],ledger:[]});
await page.route('https://lottery.test/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/state')return route.fulfill({json:state()});if(path==='/')return route.fulfill({contentType:'text/html',body:playerPage()});return route.fulfill({status:404,json:{error:'Not found'}})});
await page.clock.install({time:new Date(backendTime)});
await page.goto('https://lottery.test/');await page.locator('#app').waitFor({state:'visible'});
assert.equal(await page.locator('#luckyGrid .lucky').count(),3);assert.equal(await page.locator('.result-date').count(),0);assert(await page.locator('.hint').textContent().then(t=>t.includes('Admin အတည်ပြုထားသော')));
const initial=await page.locator('#luckyNumber2D').textContent();await page.clock.runFor(2000);assert(await page.locator('#luckyNumber2D').evaluate(e=>e.classList.contains('blinking')));await page.clock.runFor(200);assert.notEqual(await page.locator('#luckyNumber2D').textContent(),initial);assert(!await page.locator('#luckyNumber2D').evaluate(e=>e.classList.contains('blinking')));
assert.equal(await page.locator('#luckyStatus2D').textContent(),'2026-10-03');
assert(!await page.locator('body').textContent().then(x=>x.includes('Development token')));
await page.locator('#pauseTicker').click();assert.equal(await page.locator('#pauseTicker').getAttribute('aria-pressed'),'true');await page.locator('#pauseTicker').click();
// Receive an admin-published result through the normal polling route.
backendTime=Date.parse('2026-10-03T13:35:00Z');const published=backendTime;
draws=draws.map((d,i)=>({...d,status:'settled',result:['07','007','0007'][i],source:'Daily result reference',settled_at:new Date(published).toISOString()}));
await page.clock.fastForward(5100);await page.waitForFunction(()=>document.getElementById('luckyNumber4D').textContent==='0007');
await page.clock.fastForward(2100);assert.equal(await page.locator('#luckyNumber2D').textContent(),'07');assert.equal(await page.locator('#luckyNumber3D').textContent(),'007');assert.equal(await page.locator('#lucky4D').getAttribute('class'),'lucky published');
assert.equal(await page.locator('.result-day').count(),1);assert.equal(await page.locator('.result-cell strong').allTextContents().then(a=>a.join(',')),'07,007,0007');
// Myanmar midnight is 17:30 UTC, independent of browser timezone or settlement hour.
const midnight=Date.parse('2026-10-03T17:30:00Z');
backendTime=midnight-1000;await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#luckyNumber4D').textContent(),'0007');
await page.clock.runFor(2100);assert(!await page.locator('#lucky4D').evaluate(e=>e.classList.contains('published')));assert.equal(await page.locator('#luckyStatus4D').textContent(),'2026-10-04');
backendTime=midnight;await page.reload();await page.locator('#app').waitFor({state:'visible'});assert(!await page.locator('#lucky4D').evaluate(e=>e.classList.contains('published')));const expired=await page.locator('#luckyNumber4D').textContent();await page.clock.runFor(2400);assert.notEqual(await page.locator('#luckyNumber4D').textContent(),expired);assert.equal(await page.locator('.result-cell strong').last().textContent(),'0007');
// One market may be published while other markets keep rotating.
backendTime=Date.parse('2026-10-04T11:35:00Z');draws.push({id:4,day:'2026-10-04',market:'2D',cutoff:'2026-10-04T11:30:00Z',multiplier:80,status:'settled',result:'42',source:'Daily result reference',settled_at:new Date(backendTime).toISOString()});await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#luckyNumber2D').textContent(),'42');assert(!await page.locator('#lucky3D').evaluate(e=>e.classList.contains('published')));assert.equal(await page.locator('.result-day').count(),2);
await mkdir('test-artifacts',{recursive:true});
for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:1000});const bounds=await page.locator('.lucky').evaluateAll(es=>es.map(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width})));assert(bounds.every(b=>b.width>0&&b.top===bounds[0].top));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.evaluate(()=>document.getElementById('profile').getBoundingClientRect().top>document.getElementById('results').getBoundingClientRect().bottom));if(width===390||width===1280)await page.screenshot({path:`test-artifacts/player-${width}.png`,fullPage:true})}
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ticker-track').evaluate(e=>getComputedStyle(e).animationName),'none');await page.clock.runFor(2100);assert(!await page.locator('#luckyNumber3D').evaluate(e=>e.classList.contains('blinking')));
await page.locator('[data-v="results"]').click();assert(await page.locator('#results').isVisible());assert.deepEqual(errors,[]);const admin=await browser.newPage({viewport:{width:390,height:844}});admin.on('pageerror',e=>errors.push(e.message));let level='root';let lastReport='';
await admin.route('https://lottery.test/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/admin/')return route.fulfill({contentType:'text/html',body:adminPage()});if(u.pathname==='/admin/api/state')return route.fulfill({json:{admin:'owner',level,balance:1000,create_levels:level==='root'?['senior','master','player']:level==='senior'?['master','player']:['player'],day:'2026-10-03',users:[{id:2,username:'player',role:'player',parent_id:1,balance:100,can_adjust:true}],draws:level==='root'?[{id:1,day:'2026-10-03',market:'2D',cutoff:'2026-10-03T11:30:00Z',scheduled_result:null}]:[],ledger:[],audit:[]}});if(u.pathname==='/admin/api/bets'){lastReport=u.search;return route.fulfill({json:{totals:{entries:2,tokens:30},groups:[{market:'2D',number:'07',entries:2,tokens:30}],bets:[],page:1,pages:1}})}return route.fulfill({status:404,json:{error:'Not found'}})});
for(const role of ['root','senior','master']){level=role;await admin.goto('https://lottery.test/admin/');await admin.locator('#app').waitFor({state:'visible'});assert.equal(await admin.locator('#resultPanel').isVisible(),role==='root');assert.equal(await admin.locator('#level option').count(),role==='root'?3:role==='senior'?2:1);assert.equal(await admin.locator('#source').count(),0);await admin.locator('#reportSort').selectOption('count');await admin.locator('#filters button').click();await admin.waitForFunction(()=>document.getElementById('numbers').textContent.includes('07'));assert(lastReport.includes('sort=count'));assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: schedule, 2-second rotation, admin result polling, Myanmar-midnight expiry and blink animation, reload, leading zeroes, history, mobile layout, reduced motion.');
