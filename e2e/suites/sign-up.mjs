/**
 * Sign-up — registration validation by default; the real account creation is
 * opt-in, because it CANNOT be cleaned up.
 *
 * Discovered by running it: registration requires EMAIL VERIFICATION, so a newly
 * created account cannot sign in, so it cannot reach "Delete user" on account
 * management to remove itself. The `Test` account is not an org admin either —
 * /organization-admin redirects to the dashboard — so no admin surface can
 * delete it. There is no UI path to undo a registration.
 *
 * So the default run stops at the submit boundary: it fills the form, exercises
 * validation, and asserts the form is ready to submit — proving everything
 * except the write, and leaving nothing behind.
 *
 * Set E2E_ALLOW_ORPHAN_USER=1 to actually register. That covers the write and
 * the verification gate, and it PERMANENTLY leaves a user in the database that
 * a human must delete. The flag is the consent.
 *
 * See e2e/README.md for the harness rules.
 */
import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { ARTIFACTS,openSession } from '../lib/harness.mjs';

// The named inputs registration requires. A fixed list, so the per-field check
// names are stable for the gate, and so 'ready to submit' can read back the
// exact same set it asserted the existence of.
const FIELDS = ['firstname', 'lastname', 'email', 'phonenumber', 'password', 'passwordconfirmation'];
const LOGIN_FORM = { role: 'button', name: /sign in|login/i };
const REGISTER_FORM = { role: 'button', name: /^register$/i };

const stamp = Date.now();
const NEW = {
  firstname: 'E2E',
  lastname: `Probe${stamp}`,
  email: `e2e-user-${stamp}@example.invalid`, // RFC 2606: can never reach a real inbox
  phone: '8095550100',
  password: `E2e!${stamp}`,
};

(async () => {
  const s = await openSession({ suite: 'sign-up', owned: [/account/, /quick-start/] });

  // Two propTypes warnings already live on /account/register and are unrelated
  // to registration behaviour (the `Stack` one also fires on /forms/form-manager
  // on master). Listed explicitly rather than muted wholesale, so a NEW error
  // still fails this suite.
  const PRE_EXISTING = /supplied to `Stack`|Function components cannot be given refs|does not recognize the/;

  await s.go('/account/login', LOGIN_FORM, 'load sign-in so a Parse request is observed');
  await s.login();
  await s.requireWritableEnvironment();
  await s.click({ role: 'button', name: /log ?out/i }, LOGIN_FORM, 'log out before registering');

  await s.withExpectedErrors(PRE_EXISTING, async () => {
    // ── THE FORM ─────────────────────────────────────────────────────────────
    console.log('\n[FORM] the registration form is complete and addressable');
    await s.go('/account/register', REGISTER_FORM, 'open the registration form');

    const byName = (n) => s.page.locator(`input[name="${n}"]`).first();
    for (const f of FIELDS) {
      await s.check(`the ${f} field exists`, await byName(f).count() > 0);
    }

    // The organization picker is a MUI Autocomplete, whose inner text input
    // carries no `name` — a library artifact, not a Puente defect. An earlier
    // version of this check flagged it as a missing username field, which was a
    // misreading: registration has no username field at all. Assert the control
    // is present and labelled instead of counting anonymous inputs.
    // The label "Organization *" is VISIBLE, so sighted users are fine.
    const visibleLabel = await s.page.locator('label', { hasText: /organization/i }).count();
    await s.check('the organization picker is present and visibly labelled',
      visibleLabel > 0, `${visibleLabel} visible label(s)`);

    // But it is not ASSOCIATED: getByLabel finds nothing, there is no combobox
    // role, and the value lives in a hidden input. A screen-reader user tabbing
    // here may not hear what the field is. Pre-existing, and in the design
    // system's FormSelectAutoComplete rather than this page — reported, not
    // failed, because this branch did not create it.
    const associated = await s.page.getByLabel(/organization/i).count();
    const asCombobox = await s.page.getByRole('combobox').count();
    if (!associated || !asCombobox) {
      console.log('      ⚠ a11y (pre-existing): organization picker has a visible label but no'
        + ` programmatic association (getByLabel=${associated}, combobox role=${asCombobox}).`);
      console.log('        Lives in app/impacto-design-system FormSelectAutoComplete.');
    }

    await s.check('the password field is type=password, so it is masked',
      await byName('password').getAttribute('type') === 'password',
      `type=${await byName('password').getAttribute('type')}`);

    // ── VALIDATION ───────────────────────────────────────────────────────────
    console.log('\n[VALIDATION] mismatched passwords are refused before any write');
    await byName('firstname').fill(NEW.firstname);
    await byName('lastname').fill(NEW.lastname);
    await byName('email').fill(NEW.email);
    await byName('phonenumber').fill(NEW.phone);
    await byName('password').fill(NEW.password);
    await byName('passwordconfirmation').fill(`${NEW.password}-different`);

    await s.page.getByRole('button', { name: /^register$/i }).first().click();
    await s.page.waitForLoadState('networkidle').catch(() => {});
    await s.see(REGISTER_FORM);
    const mismatch = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
    await s.check('a password mismatch does not create an account',
      s.page.url().includes('/account/register'), new URL(s.page.url()).pathname);
    const notice = await s.page.getByText(/match|same|confirm|invalid|required/i).first().innerText().catch(() => '');
    await s.check('the mismatch is explained to the person filling it in',
      /match|same|confirm|invalid|required/i.test(notice) || /match/i.test(mismatch),
      JSON.stringify(notice.slice(0, 60)) || 'no notice found');
    await s.shot('password-mismatch');

    // ── THE WRITE, ONLY ON EXPLICIT CONSENT ──────────────────────────────────
    await byName('passwordconfirmation').fill(NEW.password);
    if (process.env.E2E_ALLOW_ORPHAN_USER !== '1') {
      // This is the last check most runs reach, and it used to assert `true` —
      // so the default path of this suite ended on a check that could not fail.
      // Read the form back instead: every field holds what was typed, and the
      // button that would submit it is actually enabled. That is the real claim
      // "ready to submit" makes, and it can fail.
      const filled = await Promise.all(FIELDS.map(async (f) => ({
        field: f,
        value: await byName(f).inputValue().catch(() => ''),
      })));
      const empty = filled.filter((f) => !f.value);
      const submit = s.page.getByRole('button', { name: /^register$/i }).first();
      const enabled = await submit.isEnabled().catch(() => false);
      await s.check('form is complete and ready to submit (write skipped by default)',
        empty.length === 0 && enabled,
        empty.length ? `still empty: ${empty.map((f) => f.field).join(', ')}`
          : `${filled.length} field(s) filled, Register ${enabled ? 'enabled' : 'DISABLED'}`
            + ' — set E2E_ALLOW_ORPHAN_USER=1 to actually register');
      console.log('\n  [skipped] registration NOT submitted. Nothing was created.');
      const { failed: f0 } = await s.finish();
      process.exit(f0.length ? 1 : 0);
    }

    console.log(`\n[REGISTER] creating ${NEW.email} — THIS CANNOT BE UNDONE`);
    await s.page.getByRole('button', { name: /^register$/i }).first().click();
    await s.page.waitForLoadState('networkidle').catch(() => {});
    await s.page.waitForFunction(
      () => !window.location.pathname.includes('/account/register')
        || /verif|check your email|confirm|already|error|invalid/i.test(document.body.innerText),
      null, { timeout: 30000 },
    ).catch(() => {});
    const after = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
    const verifyNotice = await s.page.getByText(/verif|check your email|confirm/i).first().innerText().catch(() => '');
    await s.check('registration is acknowledged, not silently dropped',
      /verif|confirm|success|check your email/i.test(after) || !s.page.url().includes('/account/register'),
      JSON.stringify(verifyNotice.slice(0, 70)) || new URL(s.page.url()).pathname);
    await s.shot('after-register');

    // ── THE VERIFICATION GATE HOLDS ──────────────────────────────────────────
    console.log('\n[GATE] an unverified account cannot sign in');
    await s.go('/account/login', LOGIN_FORM, 'try the new credentials');
    await s.withExpectedErrors(/status of 404|\/login|Stack|forwardRef/i, async () => {
      await s.page.locator('input[name="usernameV"], input[name="username"], input[type="email"]').first().fill(NEW.email);
      await s.page.locator('input[name="passwordV"], input[name="password"], input[type="password"]').first().fill(NEW.password);
      await s.page.getByRole('button', { name: /sign in|login/i }).first().click();
      await s.page.waitForLoadState('networkidle').catch(() => {});
    });
    const blocked = s.page.url().includes('/account/login');
    await s.check('an unverified account is refused, and told why', blocked,
      blocked ? 'held at sign-in pending verification' : `signed in without verifying: ${s.page.url()}`);

    // A console line scrolls away, and this one asserted `true` — so the suite's
    // record of an account it could not delete was the weakest thing in the run.
    // Append it to a ledger and assert the ledger really holds it: an orphan
    // this suite creates must survive as something a person can act on later.
    const ledger = join(ARTIFACTS, 'orphaned-users.log');
    let recorded = false;
    try {
      mkdirSync(ARTIFACTS, { recursive: true });
      appendFileSync(ledger, `${new Date().toISOString()}\t${NEW.email}\tapp=${s.appId ?? 'unknown'}`
        + '\tdelete by hand: Parse _User, master key required\n');
      recorded = readFileSync(ledger, 'utf8').includes(NEW.email);
    } catch (err) {
      console.log(`      could not write the orphan ledger: ${String(err).slice(0, 120)}`);
    }
    console.log(`\n  ⚠ LEFT BEHIND: ${NEW.email}`);
    console.log(`    Registration cannot be undone through the UI — recorded in ${ledger}`);
    await s.check('the orphaned account is recorded where it can be cleaned up',
      recorded, recorded ? `${NEW.email} → ${ledger}` : `NOT RECORDED — ${NEW.email} is untracked`);
  });

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
