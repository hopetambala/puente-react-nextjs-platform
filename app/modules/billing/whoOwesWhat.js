/**
 * What is outstanding, across every organization.
 *
 * **Default order is age of debt, oldest first**, and it is the default on
 * every load rather than a remembered preference. A small invoice ninety days
 * late is a relationship that needs a phone call; a large one sent yesterday is
 * just business. A remembered sort would let the screen quietly come up
 * amount-sorted one morning and change which invoice someone chases, so the
 * default is re-asserted every time and sorting is a deliberate act.
 *
 * **USD only.** Every partner is a US entity billed in USD (scope §Context), so
 * there is one total rather than a per-currency map. A non-USD invoice is
 * therefore a data error, not a feature: it is excluded from the total AND
 * named, because silently summing it would fabricate an exchange rate and
 * silently dropping it would understate the debt.
 *
 * Payment state is read, never derived. Stripe holds the money and is the only
 * ledger (the referee rule): an invoice with nothing left to pay is still
 * `open` here until Stripe says otherwise.
 */

/** Stripe's terminal states. Anything else is still owed. */
const SETTLED = new Set(['paid', 'void', 'uncollectible']);

export const BILLING_CURRENCY = 'usd';

const SORTS = {
  age: (a, b) => b.daysOverdue - a.daysOverdue,
  amount: (a, b) => (b.amountDue || 0) - (a.amountDue || 0),
};

const daysBetween = (later, earlier) => Math.floor(
  (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24),
);

export function summarizeOutstanding({ invoices, now = new Date(), sortBy } = {}) {
  // A read that could not run must never render as "nothing owed". That is the
  // worst lie a money screen can tell, and it looks exactly like good news.
  if (!Array.isArray(invoices)) {
    return {
      rows: [], total: null, currency: BILLING_CURRENCY, unexpectedCurrencies: [],
      sortBy: 'age', unavailable: true,
    };
  }

  // An unrecognised sort falls back rather than leaving the list arbitrary. The
  // order of a money screen is information; an arbitrary one is a wrong answer
  // that looks fine.
  const order = SORTS[sortBy] ? sortBy : 'age';

  const rows = invoices
    .filter((invoice) => !SETTLED.has(invoice.status))
    .map((invoice) => {
      const due = invoice.dueAt ? new Date(invoice.dueAt) : null;
      return {
        ...invoice,
        // Never negative: an invoice not yet due is 0 days overdue, not
        // "-30 days overdue", which reads as a credit.
        daysOverdue: due ? Math.max(0, daysBetween(now, due)) : 0,
      };
    })
    .sort(SORTS[order]);

  const foreign = rows.filter(
    (invoice) => (invoice.currency || BILLING_CURRENCY) !== BILLING_CURRENCY,
  );

  const total = rows
    .filter((invoice) => (invoice.currency || BILLING_CURRENCY) === BILLING_CURRENCY)
    .reduce((sum, invoice) => sum + (invoice.amountDue || 0), 0);

  return {
    rows,
    total,
    currency: BILLING_CURRENCY,
    unexpectedCurrencies: [...new Set(foreign.map((i) => i.currency))],
    sortBy: order,
    unavailable: false,
  };
}

export default summarizeOutstanding;
