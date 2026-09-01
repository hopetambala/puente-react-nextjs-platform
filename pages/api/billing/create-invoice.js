import { createInvoice, secretFromEnv, toStripeLineItems } from 'app/services/stripe';

/**
 * Creates a DRAFT invoice in Stripe.
 *
 * This route exists for exactly one reason: **the Stripe secret must never
 * reach the browser.** Next.js inlines every `NEXT_PUBLIC_*` variable into the
 * client bundle, so a browser-side Stripe call would mean publishing the key to
 * every visitor. Everything that touches the key happens here, server-side.
 *
 * `env` is injected so the secret handling is testable without one ever
 * existing in the test environment.
 *
 * Not authorization. Creating a Stripe invoice does not read or write Parse, so
 * there is no organization data to leak — but the Manage route that calls this
 * is staff-gated, and the invoice cannot be SENT from here at all.
 */
export default async function handler(req, res, { env = process.env } = {}) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST.' });
  }

  const secret = secretFromEnv(env);
  if (!secret) {
    // 503, not 500. This is "not configured yet", which is a true and expected
    // state until Phase 0 runs - and a stack trace would tell the operator
    // nothing about what to do next.
    return res.status(503).json({
      error: 'Billing is not configured. STRIPE_SECRET_KEY is unset, so no invoice can be created yet.',
    });
  }

  const { draft } = req.body || {};
  if (!draft) return res.status(400).json({ error: 'A draft is required.' });

  // Validate the line items BEFORE calling Stripe, so a malformed draft is a
  // 400 the operator can act on rather than a 500 from a vendor.
  try {
    toStripeLineItems(draft.lineItems, draft.currency);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { invoice } = await createInvoice(draft, { secret });
    return res.status(201).json({
      stripeInvoiceId: invoice.id,
      status: invoice.status,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    });
  } catch (error) {
    // Never echo the error verbatim: a Stripe client error can quote the request
    // it received, and the request carried the key. A key in an error body is a
    // key in the browser, which is the one thing this route exists to prevent.
    return res.status(502).json({ error: 'Stripe rejected the invoice. Check the Stripe dashboard.' });
  }
}
