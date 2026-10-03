import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdir} from 'node:fs/promises';
import {playerPage} from '../ui-player.mjs';
import {cutoffFor} from '../schedule.mjs';
for(const [market,hour] of [['2D','11'],['3D','12'],['4D','13']])assert.equal(cutoffFor('2026-10-03',market).toISOString(),`2026-10-03T${hour}:30:00.000Z`);
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let backendTime=Date.parse('2026-10-03T10:00:00Z');
let draws=['2D','3D','4D'].map((market,i)=>({id:i+1,day:'2026-10-03',market,cutoff:cutoffFor('2026-10-03',market).toISOString(),multiplier:[80,650,6000][i],status:'open',result:null,source:null,settled_at:null}));
const state=()=>({account:{username:'futurecode',balance:125000,daily_limit:100000,excluded_until:null},day:'2026-10-03',server_time:new Date(backendTime).toISOString(),draws,bets:[],ledger:[]});
await page.route('https://lottery.test/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/state')return route.fulfill({json:state()});if(path==='/')return route.fulfill({contentType:'text/html',body:playerPage()});return route.fulfill({status:404,json:{error:'Not found'}})});
await page.clock.install({time:new Date(backendTime)});
await page.goto('https://lottery.test/');await page.locator('#app').waitFor({state:'visible'});
assert.equal(await page.locator('#luckyGrid .lucky').count(),3);
const initial=await page.locator('#luckyNumber2D').textContent();await page.clock.fastForward(2100);assert.notEqual(await page.locator('#luckyNumber2D').textContent(),initial);
assert.equal(await page.locator('#luckyStatus2D').textContent(),'ရလဒ်စောင့်နေ');
assert(!await page.locator('body').textContent().then(x=>x.includes('Development token')));
await page.locator('#pauseTicker').click();assert.equal(await page.locator('#pauseTicker').getAttribute('aria-pressed'),'true');await page.locator('#pauseTicker').click();
// Receive an admin-published result through the normal polling route.
backendTime=Date.parse('2026-10-03T13:35:00Z');const published=backendTime;
draws=draws.map((d,i)=>({...d,status:'settled',result:['07','007','0007'][i],source:'Daily result reference',settled_at:new Date(published).toISOString()}));
await page.clock.fastForward(5100);await page.waitForFunction(()=>document.getElementById('luckyNumber4D').textContent==='0007');
await page.clock.fastForward(2100);assert.equal(await page.locator('#luckyNumber2D').textContent(),'07');assert.equal(await page.locator('#luckyNumber3D').textContent(),'007');assert.equal(await page.locator('#lucky4D').getAttribute('class'),'lucky published');
assert.equal(await page.locator('.result-day').count(),1);assert.equal(await page.locator('.result-cell strong').allTextContents().then(a=>a.join(',')),'07,007,0007');
// Reconnection/reload just before expiry still uses settlement time from the server.
backendTime=published+8*3600000-1000;await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#luckyNumber4D').textContent(),'0007');
backendTime=published+8*3600000;await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#luckyStatus4D').textContent(),'ရလဒ်စောင့်နေ');const expired=await page.locator('#luckyNumber4D').textContent();await page.clock.fastForward(2100);assert.notEqual(await page.locator('#luckyNumber4D').textContent(),expired);assert.equal(await page.locator('.result-cell strong').last().textContent(),'0007');
// One market may be published while other markets keep rotating.
backendTime=Date.parse('2026-10-04T11:35:00Z');draws.push({id:4,day:'2026-10-04',market:'2D',cutoff:'2026-10-04T11:30:00Z',multiplier:80,status:'settled',result:'42',source:'Daily result reference',settled_at:new Date(backendTime).toISOString()});await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#luckyNumber2D').textContent(),'42');assert.equal(await page.locator('#luckyStatus3D').textContent(),'ရလဒ်စောင့်နေ');assert.equal(await page.locator('.result-day').count(),2);
await mkdir('test-artifacts',{recursive:true});
for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:1000});const bounds=await page.locator('.lucky').evaluateAll(es=>es.map(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width})));assert(bounds.every(b=>b.width>0&&b.top===bounds[0].top));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.evaluate(()=>document.getElementById('profile').getBoundingClientRect().top>document.getElementById('results').getBoundingClientRect().bottom));if(width===390||width===1280)await page.screenshot({path:`test-artifacts/player-${width}.png`,fullPage:true})}
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ticker-track').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.locator('[data-v="results"]').click();assert(await page.locator('#results').isVisible());assert.deepEqual(errors,[]);await browser.close();console.log('PASS: schedule, 2-second rotation, admin result polling, 8-hour expiry, reload, leading zeroes, history, mobile layout, reduced motion.');
