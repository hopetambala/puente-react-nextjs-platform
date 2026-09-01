import '@testing-library/jest-dom';

import handler from 'pages/api/billing/create-invoice';

const res = () => {
  const r = { statusCode: null, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

describe('POST /api/billing/create-invoice', () => {
  it('refuses anything but POST', async () => {
    const r = res();
    await handler({ method: 'GET', body: {} }, r);
    expect(r.statusCode).toBe(405);
  });

  it('reports that billing is not configured rather than crashing', async () => {
    // Phase 0 may simply not have happened. A 500 stack trace tells the
    // operator nothing; naming the missing configuration tells them everything.
    const r = res();
    await handler({ method: 'POST', body: { draft: { lineItems: [] } } }, r, { env: {} });
    expect(r.statusCode).toBe(503);
    expect(JSON.stringify(r.body)).toMatch(/STRIPE_SECRET_KEY|not configured/i);
  });

  it('never returns the secret in a response, even on error', async () => {
    // The whole point of this route existing. A key echoed in an error body is
    // a key in the browser.
    const r = res();
    await handler(
      { method: 'POST', body: { draft: { lineItems: [{ quantity: 3, amount: 100, description: 'x' }] } } },
      r,
      { env: { STRIPE_SECRET_KEY: 'sk_test_supersecret' } },
    );
    expect(JSON.stringify(r.body)).not.toMatch(/sk_test_supersecret/);
  });

  it('surfaces a bad line item as a 400, not a 500', async () => {
    const r = res();
    await handler(
      { method: 'POST', body: { draft: { lineItems: [{ quantity: 3, amount: 100, description: 'x' }] } } },
      r,
      { env: { STRIPE_SECRET_KEY: 'sk_test_supersecret' } },
    );
    expect(r.statusCode).toBe(400);
  });
});
