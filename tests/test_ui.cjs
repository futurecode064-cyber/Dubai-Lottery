// Optional browser integration test: npm package playwright and Chromium required.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dubai-ui-'));
const python=`
import sys, datetime as dt
sys.path.insert(0,sys.argv[1])
import app,core
from http.server import ThreadingHTTPServer
core.now=lambda:dt.datetime(2026,10,2,10,0,tzinfo=dt.timezone.utc)
app.store=core.Store(sys.argv[2])
admin=app.store.create_user('owner','admin_password_123',role='admin')
player=app.store.create_user('player','player_password_123',actor=admin)
app.store.adjust(admin,player,10000,'UI test credits','ui_initial_key_12345')
server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
print('READY:'+str(server.server_port),flush=True)
server.serve_forever()
`;
const server=spawn('python3',['-u','-c',python,path.join(root,'server'),path.join(temp,'ui.sqlite3')],{stdio:['ignore','pipe','pipe']});
let browser;
(async()=>{
  const port=await new Promise((resolve,reject)=>{
    let out='';const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);
    server.stdout.on('data',data=>{out+=data;const m=out.match(/READY:(\d+)/);if(m){clearTimeout(timer);resolve(m[1])}});
    server.once('exit',code=>reject(new Error('Server exited '+code)));
  });
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+port);
  await page.locator('#username').fill('player');
  await page.locator('#password').fill('player_password_123');
  await page.locator('#loginForm button').click();
  await page.locator('#app').waitFor({state:'visible'});
  assert.equal(await page.locator('#balance').innerText(),'10,000');
  assert.equal(await page.locator('.num').count(),100);
  await page.locator('[data-number="07"]').click();
  assert.equal(await page.locator('#potential').innerText(),'800');
  await page.locator('#place').click();
  await page.waitForFunction(()=>document.getElementById('balance').textContent==='9,990');
  await page.locator('[data-tab="history"]').click();
  assert.match(await page.locator('#historyList').innerText(),/2D · 07/);
  await page.locator('[data-tab="play"]').click();
  await page.locator('[data-market="3D"]').click();
  assert.match(await page.locator('#pageLabel').innerText(),/1 \/ 10 · 1,000/);
  await page.locator('[data-market="4D"]').click();
  assert.match(await page.locator('#pageLabel').innerText(),/1 \/ 100 · 10,000/);
  await page.locator('#search').fill('၀၀၀၇');
  assert.equal(await page.locator('.num').count(),1);
  assert.equal(await page.locator('.num').innerText(),'0007');
  await page.locator('.num').click();
  assert.equal(await page.locator('#potential').innerText(),'60,000');
  for (const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-market="2D"]').click();
  await page.locator('[data-number="07"]').click();
  if(process.argv[2])await page.screenshot({path:path.resolve(process.argv[2]),fullPage:true});
  await page.locator('#logout').click();
  await page.locator('#login').waitFor({state:'visible'});
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill('admin_password_123');
  await page.locator('#loginForm button').click();
  await page.locator('[data-view="admin"]').waitFor({state:'visible'});
  assert.match(await page.locator('#usersList').innerText(),/player/);
  await page.locator('#delta').fill('100');
  await page.locator('#reason').fill('Manual UI credit reference');
  await page.locator('#adjustForm button').click();
  await page.waitForFunction(()=>document.getElementById('usersList').innerText.includes('10,090'));
  await page.locator('#newUser').fill('new_player');
  await page.locator('#newPassword').fill('new_password_123');
  await page.locator('#createForm button').click();
  await page.waitForFunction(()=>document.getElementById('usersList').innerText.includes('new_player'));
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: login, entry, balance, history, leading zeroes, Myanmar search, 2D/3D/4D pages, four viewport sizes, admin adjustment, account creation, no JavaScript errors.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  if(browser)await browser.close();server.kill();fs.rmSync(temp,{recursive:true,force:true});
});
