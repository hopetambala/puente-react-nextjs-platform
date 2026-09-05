/**
 * Sign-in — the gate every other feature sits behind.
 *
 * Read-only: creates nothing, so it is safe against any environment.
 * See e2e/README.md for the harness rules.
 */
import { openSession, BASE } from '../lib/harness.mjs';

const DASHBOARD = { role: 'link', name: /unresolved household|missing key fields|records/i };
const LOGIN_FORM = { role: 'button', name: /sign in|login/i };

(async () => {
  const s = await openSession({ suite: 'sign-in', owned: [/account/, /quick-start/] });

  // ── A PROTECTED ROUTE IS ACTUALLY PROTECTED ──────────────────────────────
  console.log('\n[GATE] an unauthenticated visitor cannot reach the data');
  await s.go('/quick-start', LOGIN_FORM, 'visit the dashboard signed out');
  await s.check('signed-out visit to a protected route lands on sign-in',
    /account\/login|\/$/.test(new URL(s.page.url()).pathname), s.page.url());
  const leaked = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
  await s.check('no record data rendered before authentication',
    !/of \d+ records|missing key fields|quiet \d/i.test(leaked), `${leaked.length} chars`);

  // ── WRONG CREDENTIALS ARE REFUSED ────────────────────────────────────────
  console.log('\n[REJECT] a bad password does not get in');
  const user = () => s.page.locator('input[name="usernameV"], input[name="username"], input[type="email"]').first();
  const pass = () => s.page.locator('input[name="passwordV"], input[name="password"], input[type="password"]').first();

  // Parse answers a bad password with `404 POST /login` (error 101). That is the
  // CORRECT rejection, not a fault, and this block causes it on purpose — so it
  // is declared rather than allowed to fail the console check. Verified that a
  // plain page load produces zero 4xx responses, so the tolerance is not hiding
  // anything pre-existing.
  await s.withExpectedErrors(/status of 404|\/login/i, async () => {
    await user().fill('Test');
    await pass().fill('definitely-not-the-password');
    await s.page.getByRole('button', { name: /sign in|login/i }).first().click();
    await s.page.waitForLoadState('networkidle').catch(() => {});
    await s.see(LOGIN_FORM);
  });

  await s.check('a wrong password leaves the visitor on sign-in',
    s.page.url().includes('/account/login'), s.page.url());

  // Assert the MESSAGE, and report the message — not a prefix of the page body.
  // An earlier version printed the login page's marketing quote as its evidence,
  // which read like a false pass even though the assertion was sound.
  const notice = await s.page.getByText(/invalid|incorrect|try again|failed/i).first()
    .innerText().catch(() => '');
  await s.check('the refusal is communicated, not silent',
    /invalid|incorrect|try again|failed/i.test(notice), JSON.stringify(notice.slice(0, 60)));
  await s.shot('rejected');

  // ── PASSWORD FIELD HYGIENE ───────────────────────────────────────────────
  // A sign-in form is the one place a browser must be able to mask input and
  // offer a password manager. `type=text` defeats both.
  const passType = await pass().getAttribute('type');
  await s.check('the password field is type=password, so it is masked',
    passType === 'password', `type=${passType}`);

  // ── VALID CREDENTIALS GET IN ─────────────────────────────────────────────
  console.log('\n[ACCEPT] the real credentials reach the data');
  await s.login();
  await s.go('/quick-start', DASHBOARD, 'load the dashboard as a signed-in user');
  await s.check('signing in reaches real record data', true, s.page.url());

  // ── THE SESSION SURVIVES A RELOAD ────────────────────────────────────────
  console.log('\n[SESSION] a reload does not throw the coordinator out');
  await s.step('hard reload while signed in', () => s.page.reload(), DASHBOARD);
  await s.check('session survives a reload', !s.page.url().includes('/account/login'), s.page.url());

  // ── LOG OUT ──────────────────────────────────────────────────────────────
  console.log('\n[LOGOUT] logging out really ends the session');
  await s.click({ role: 'button', name: /log ?out/i }, LOGIN_FORM, 'click Log out');
  await s.check('log out returns to sign-in', /account\/login|\/$/.test(new URL(s.page.url()).pathname), s.page.url());
  await s.go('/quick-start', LOGIN_FORM, 'try the dashboard again after logging out');
  await s.check('the protected route is protected again after logout',
    /account\/login|\/$/.test(new URL(s.page.url()).pathname), s.page.url());

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
