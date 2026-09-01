/**
 * The only module that talks to Stripe.
 *
 * **Server-side only.** Everything here runs behind `pages/api/`, never in a
 * component, because the secret key must never reach the browser. Next.js
 * inlines every `NEXT_PUBLIC_*` variable into the client bundle — this repo
 * already ships `NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL` that way — so
 * copying that shape for a Stripe secret would publish it to every visitor.
 * `secretFromEnv` refuses to read one, and a test asserts the refusal.
 *
 * Stripe is the money rail and the system of record for payment state. This
 * module creates and reads; it never decides whether something is paid.
 */

/**
 * The secret key, or null.
 *
 * Null rather than a throw so a caller can report "billing is not configured"
 * instead of crashing a route — Phase 0 may simply not have happened yet.
 */
export function secretFromEnv(env = {}) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  // pk_ is the PUBLISHABLE key. Accepting it here would fail confusingly at the
  // first write instead of obviously at startup.
  if (!String(secret).startsWith('sk_')) return null;
  return secret;
}

/**
 * Draft line items → Stripe's shape.
 *
 * The draft carries `amount` as unit x quantity, because that is what an
 * operator reads. Stripe wants `unit_amount` and `quantity` separately, and
 * sending the total as the unit price bills quantity SQUARED — two form builds
 * at $2,000 would invoice $8,000. That conversion is the reason this function
 * exists rather than a spread.
 */
export function toStripeLineItems(lineItems = [], currency = 'usd') {
  return lineItems.map((item) => {
    if (!item.description) {
      throw new Error('toStripeLineItems: every line needs a description — it is what the partner reads');
    }
    const quantity = item.quantity || 1;
    if (item.amount % quantity !== 0) {
      throw new Error(
        `toStripeLineItems: "${item.description}" amount ${item.amount} is not `
        + `divisible by quantity ${quantity}; rounding a unit price would silently `
        + 'change what the partner is charged',
      );
    }
    return {
      description: item.description,
      quantity,
      unit_amount: item.amount / quantity,
      currency,
    };
  });
}

/**
 * Creates a DRAFT invoice in Stripe. It is not sent here.
 *
 * Draft on purpose: an operator reviews and sends from the composer, and an
 * invoice that emails a partner the instant a button is clicked removes the
 * step where a mistake is still cheap to fix.
 */
export async function createInvoice(draft, { secret, fetchImpl } = {}) {
  // Resolved INSIDE the body, not as a default parameter. A default is
  // evaluated before the body runs, so `fetchImpl = fetch` threw
  // "fetch is not defined" under jest and masked the real check below.
  if (!secret) {
    throw new Error(
      'createInvoice: STRIPE_SECRET_KEY is not set. Billing is not configured — '
      + 'Phase 0 (Stripe Products, Prices, branding, terms) has to happen first.',
    );
  }

  const send = fetchImpl || fetch;
  const lines = toStripeLineItems(draft.lineItems, draft.currency);
  const response = await send('https://api.stripe.com/v1/invoices', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: draft.stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: String(draft.netTermsDays || 30),
      auto_advance: 'false',
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`createInvoice: Stripe returned ${response.status} ${body.slice(0, 200)}`);
  }
  return { invoice: await response.json(), lines };
}

export default { secretFromEnv, toStripeLineItems, createInvoice };
