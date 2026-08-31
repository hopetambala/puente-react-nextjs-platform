import '@testing-library/jest-dom';

import {
  buildDraftInvoice,
} from 'app/modules/billing/draftInvoice';

// Plan §4: flat tier per organization plus a rate card for services. Usage is
// EVIDENCE attached to the invoice, never the basis of the charge, because
// `createdAt` is sync time - a week of offline backlog lands in one day, so a
// metered invoice spikes for a month in which no extra fieldwork happened and
// the customer cannot verify the number.

const RATE_CARD = {
  currency: 'usd',
  plans: { partner: 25000, 'partner-lite': 10000, 'no-charge': 0 },
  services: { 'custom-form-build': 40000, 'data-cleanup': 15000 },
};

const PERIOD = { from: '2026-08-01', to: '2026-08-31' };

describe('buildDraftInvoice — the flat tier', () => {
  it('charges the tier for the organization plan, from the rate card', () => {
    const draft = buildDraftInvoice({
      organization: { shortCode: 'wof', name: 'WOF', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
    });
    expect(draft.lineItems).toEqual([
      expect.objectContaining({ kind: 'plan', amount: 25000, quantity: 1 }),
    ]);
    expect(draft.subtotal).toBe(25000);
    expect(draft.currency).toBe('usd');
  });

  it('refuses to guess when the organization has no plan', () => {
    // The dangerous defaults are both wrong: defaulting to zero silently stops
    // billing a paying partner, and defaulting to the full tier invoices someone
    // who never agreed to it. 56 of 58 organizations have no plan set today.
    const draft = buildDraftInvoice({
      organization: { shortCode: 'michigan', name: 'Michigan' },
      period: PERIOD,
      rateCard: RATE_CARD,
    });
    expect(draft.lineItems).toEqual([]);
    expect(draft.unbillable).toBe(true);
    expect(draft.reason).toMatch(/plan/i);
  });

  it('produces a zero-value draft for a no-charge partner, not an empty one', () => {
    // A no-charge partner is a DECISION, not an absence. It must render as a
    // line the operator can see, or it is indistinguishable from the bug above.
    const draft = buildDraftInvoice({
      organization: { shortCode: 'ayuda', name: 'Ayuda', plan: 'no-charge' },
      period: PERIOD,
      rateCard: RATE_CARD,
    });
    expect(draft.unbillable).toBe(false);
    expect(draft.subtotal).toBe(0);
    expect(draft.lineItems).toHaveLength(1);
  });

  it('refuses a plan the rate card does not price', () => {
    const draft = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'enterprise' },
      period: PERIOD,
      rateCard: RATE_CARD,
    });
    expect(draft.unbillable).toBe(true);
    expect(draft.reason).toMatch(/enterprise/);
  });
});

describe('buildDraftInvoice — services from the rate card', () => {
  it('adds service line items with quantity', () => {
    const draft = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
      services: [{ code: 'custom-form-build', quantity: 2 }],
    });
    expect(draft.subtotal).toBe(25000 + 80000);
    expect(draft.lineItems).toHaveLength(2);
  });

  it('refuses a service code the rate card does not price', () => {
    const draft = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
      services: [{ code: 'skywriting', quantity: 1 }],
    });
    expect(draft.unbillable).toBe(true);
    expect(draft.reason).toMatch(/skywriting/);
  });
});

describe('buildDraftInvoice — usage is evidence, never the charge', () => {
  it('attaches usage without it touching the subtotal', () => {
    const withUsage = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
      usage: { SurveyData: 3647, FormResults: 12484, Vitals: 14482 },
    });
    const withoutUsage = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
    });
    expect(withUsage.subtotal).toBe(withoutUsage.subtotal);
    expect(withUsage.evidence.counts).toEqual({ SurveyData: 3647, FormResults: 12484, Vitals: 14482 });
  });

  it('labels the period basis as SYNCED, not collected', () => {
    // createdAt is when Parse received the record. Calling it "collected" on a
    // document a partner reads is a claim about fieldwork the data cannot
    // support - the plan requires the word "Synced".
    const draft = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
      usage: { SurveyData: 10 },
    });
    expect(draft.evidence.basis).toBe('synced');
    expect(draft.evidence.label).toMatch(/synced/i);
    expect(draft.evidence.label).not.toMatch(/collected/i);
  });

  it('never carries payment state', () => {
    // The referee rule: Stripe is the ledger. A draft that can express "paid"
    // is the start of a competing ledger, so the shape must make it impossible.
    const draft = buildDraftInvoice({
      organization: { shortCode: 'wof', plan: 'partner' },
      period: PERIOD,
      rateCard: RATE_CARD,
    });
    expect(draft).not.toHaveProperty('paid');
    expect(draft).not.toHaveProperty('status');
    expect(draft).not.toHaveProperty('stripeInvoiceId');
  });
});
