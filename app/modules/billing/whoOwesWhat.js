/**
 * What is outstanding, across every organization, oldest debt first.
 *
 * Sorted by **age of debt, not amount**. A small invoice ninety days late is a
 * relationship that needs a phone call; a large one sent yesterday is just
 * business. Sorting by amount puts the loudest number on top and buries the one
 * that actually needs attention.
 *
 * This module reads payment state and never derives it. Stripe holds the money
 * and is the only ledger (the referee rule): an invoice with nothing left to pay
 * is still `open` here until Stripe says otherwise, because a second opinion
 * about whether cash arrived is how two systems start disagreeing about money.
 */

/** Stripe's terminal states. Anything else is still owed. */
const SETTLED = new Set(['paid', 'void', 'uncollectible']);

const daysBetween = (later, earlier) => Math.floor(
  (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24),
);

export function summarizeOutstanding({ invoices, now = new Date() } = {}) {
  // A read that could not run must never render as "nothing owed". That is the
  // worst lie a money screen can tell, and it looks exactly like good news.
  if (!Array.isArray(invoices)) {
    return { rows: [], totals: {}, unavailable: true };
  }

  const rows = invoices
    .filter((invoice) => !SETTLED.has(invoice.status))
    .map((invoice) => {
      const due = invoice.dueAt ? new Date(invoice.dueAt) : null;
      return {
        ...invoice,
        // Never negative: an invoice that is not due yet is 0 days overdue, not
        // "-30 days overdue", which reads as a credit.
        daysOverdue: due ? Math.max(0, daysBetween(now, due)) : 0,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Per currency. Summing usd and dop into one figure invents an exchange rate,
  // and an invented number on a money screen is worse than no number.
  const totals = rows.reduce((acc, invoice) => {
    const currency = invoice.currency || 'usd';
    acc[currency] = (acc[currency] || 0) + (invoice.amountDue || 0);
    return acc;
  }, {});

  return { rows, totals, unavailable: false };
}

export default summarizeOutstanding;
