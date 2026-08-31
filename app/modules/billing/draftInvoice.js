/**
 * Builds the draft an operator edits before an invoice is created in Stripe.
 *
 * Three rules from the billing scope are encoded here rather than left to the
 * UI, because a UI is the wrong place to enforce a money rule:
 *
 * 1. **Flat tier, never metered** (§4). `createdAt` is SYNC time, not collection
 *    time: a week of offline fieldwork syncs in one day, so a metered invoice
 *    spikes in a month where nothing extra happened and the partner cannot
 *    verify the number. For a nonprofit invoicing its closest partners, an
 *    unexplainable invoice is worse than no invoice.
 * 2. **Usage is evidence attached to the charge, never the basis of it** (§4).
 * 3. **No payment state, ever** (the referee rule, §1). Stripe holds the money
 *    and is the only ledger. This shape cannot express `paid`, so Parse cannot
 *    grow a competing opinion about whether cash arrived.
 *
 * Amounts are integer minor units (cents), matching Stripe. Floats do not
 * belong anywhere near money.
 */

/**
 * Refusing is a feature.
 *
 * 56 of 58 organizations have no `plan` today. Both convenient defaults are
 * wrong in opposite directions: defaulting to zero silently stops billing a
 * paying partner, and defaulting to the tier invoices someone who never agreed
 * to it. An explicit refusal puts the row in front of the operator instead.
 */
function unbillable(reason) {
  return {
    lineItems: [], subtotal: 0, currency: null, unbillable: true, reason,
  };
}

export function buildDraftInvoice({
  organization = {}, period = {}, rateCard = {}, services = [], usage = null,
} = {}) {
  const plans = rateCard.plans || {};
  const catalogue = rateCard.services || {};
  const currency = rateCard.currency || 'usd';

  const { plan } = organization;
  if (!plan) {
    return unbillable(
      `${organization.shortCode || 'organization'} has no plan set, so there is `
      + 'nothing to charge. Set one before invoicing.',
    );
  }
  // A plan the rate card cannot price is a configuration gap, not a free
  // customer. Say which plan, so the fix is obvious.
  if (!(plan in plans)) {
    return unbillable(`the rate card does not price the plan "${plan}"`);
  }

  const lineItems = [{
    kind: 'plan',
    code: plan,
    description: `${organization.name || organization.shortCode} — ${plan}`,
    quantity: 1,
    amount: plans[plan],
  }];

  const unpriced = services.find((service) => !(service.code in catalogue));
  if (unpriced) {
    return unbillable(`the rate card does not price the service "${unpriced.code}"`);
  }

  services.forEach((service) => {
    const quantity = service.quantity || 1;
    lineItems.push({
      kind: 'service',
      code: service.code,
      description: service.description || service.code,
      quantity,
      amount: catalogue[service.code] * quantity,
    });
  });

  const draft = {
    organization: organization.shortCode,
    period,
    currency,
    lineItems,
    subtotal: lineItems.reduce((sum, item) => sum + item.amount, 0),
    unbillable: false,
  };

  if (usage) {
    draft.evidence = {
      counts: usage,
      // "Synced", never "Collected". createdAt is when Parse received the
      // record, and a partner reading "collected" on an invoice is being told
      // something about fieldwork that the data cannot support.
      basis: 'synced',
      label: `Records synced ${period.from} to ${period.to}`,
    };
  }

  return draft;
}

export default buildDraftInvoice;
