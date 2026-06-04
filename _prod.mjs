import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 1 });
await p.goto('https://puente-manage.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(3000);
// find a username field (old version selectors unknown)
const userSel = ['input[name="usernameV"]','input[name="username"]','input[type="email"]','input[type="text"]'];
let filled = false;
for (const s of userSel) { if (await p.$(s)) { await p.fill(s, 'TestCMM'); filled = true; break; } }
const passSel = ['input[name="passwordV"]','input[name="password"]','input[type="password"]'];
for (const s of passSel) { if (await p.$(s)) { await p.fill(s, 'test'); break; } }
console.log('login field found:', filled, '| url:', p.url());
// click a sign-in button
await (p.getByRole('button', { name: /sign|log\s*in|login/i }).first().click().catch(()=>p.keyboard.press('Enter')));
await p.waitForTimeout(6000);
console.log('after login:', p.url());
await p.goto('https://puente-manage.vercel.app/forms/form-manager', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(9000);
const txt = await p.evaluate(() => document.body.innerText);
console.log('--- PROD PAGE TEXT (first 1500 chars) ---'); console.log(txt.slice(0,1500));
await p.screenshot({ path: '.claude/screenshots/fm-prod.png', fullPage: true });
await b.close();
