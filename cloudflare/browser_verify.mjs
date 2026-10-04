import { createHash, randomBytes } from 'node:crypto';
import { chromium } from 'playwright';

const base = process.env.WORKER_URL.replace(/\/$/, '');
const admin = createHash('sha256').update(process.env.CLOUDFLARE_API_TOKEN + ':dubai-lottery-freeplay-admin-v1').digest('hex');
const username = 'webqa_' + randomBytes(8).toString('hex');
const password = randomBytes(24).toString('base64url');
console.log('::add-mask::' + admin);
console.log('::add-mask::' + password);
console.log('ADMIN_CREDENTIAL_SHA256=' + createHash('sha256').update(admin).digest('hex'));
const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Dubai-Lottery-Live-QA/1.0', 'X-Demo-Admin-Key': admin };
let browser, user;
try {
  const response = await fetch(base + '/admin/users', { method: 'POST', headers, body: JSON.stringify({ username, password, starting_points: 10000 }) });
  if (!response.ok) throw new Error('Browser fixture creation failed: ' + response.status);
  user = await response.json();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: 'Dubai-Lottery-Live-QA/1.0' });
  const page = await context.newPage();
  await page.goto(base + '/admin');
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill(admin);
  await page.locator('#loginButton').click();
  await page.locator('#dashboard').waitFor({ state: 'visible' });
  if (!(await page.locator('#users').innerText()).includes(username)) throw new Error('Admin dashboard did not list fixture');
  await page.locator('#logout').click();
  await page.locator('#login').waitFor({ state: 'visible' });
  await page.goto(base + '/player');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#loginForm button').click();
  await page.locator('#app').waitFor({ state: 'visible' });
  if ((await page.locator('#accountName').innerText()) !== username) throw new Error('Player account did not render');
  await page.locator('#logout').click();
  await page.locator('#login').waitFor({ state: 'visible' });
  console.log('LIVE_BROWSER_VERIFY=passed: admin login/dashboard/logout and player login/account/logout');
} finally {
  if (browser) await browser.close();
  if (user) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`;
    for (const [sql, params] of [
      ['DELETE FROM sessions WHERE user_id=?', [user.id]],
      ['DELETE FROM users WHERE id=? AND username=?', [user.id, username]],
      ['DELETE FROM login_rate WHERE key=?', ['login:' + username]]
    ]) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN }, body: JSON.stringify({ sql, params }) });
      if (!response.ok || !(await response.json()).success) throw new Error('Browser fixture cleanup failed');
    }
    console.log('LIVE_BROWSER_FIXTURES=cleaned');
  }
}
