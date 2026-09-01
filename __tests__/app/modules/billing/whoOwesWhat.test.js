import '@testing-library/jest-dom';

import { summarizeOutstanding } from 'app/modules/billing/whoOwesWhat';

// Plan §5 Phase 2: "Who-owes-what - one list across all orgs, sorted by age of
// debt." Age of debt, not amount: a small invoice ninety days late is a
// relationship problem, a large one sent yesterday is not.

const NOW = new Date('2026-08-31T00:00:00.000Z');

const invoice = (over) => ({
  stripeInvoiceId: 'in_1', organization: 'wof', currency: 'usd',
  amountDue: 25000, status: 'open', dueAt: '2026-08-01T00:00:00.000Z', ...over,
});

describe('summarizeOutstanding', () => {
  it('sorts by age of debt, oldest first — not by amount', () => {
    const result = summarizeOutstanding({
      invoices: [
        invoice({ stripeInvoiceId: 'new_big', amountDue: 900000, dueAt: '2026-08-30T00:00:00.000Z' }),
        invoice({ stripeInvoiceId: 'old_small', amountDue: 100, dueAt: '2026-05-01T00:00:00.000Z' }),
      ],
      now: NOW,
    });
    expect(result.rows.map((r) => r.stripeInvoiceId)).toEqual(['old_small', 'new_big']);
  });

  it('reports days overdue, and zero rather than negative for one not yet due', () => {
    const result = summarizeOutstanding({
      invoices: [invoice({ dueAt: '2026-09-30T00:00:00.000Z' })],
      now: NOW,
    });
    expect(result.rows[0].daysOverdue).toBe(0);
  });

  it('excludes paid and void invoices from what is owed', () => {
    const result = summarizeOutstanding({
      invoices: [
        invoice({ stripeInvoiceId: 'a', status: 'paid' }),
        invoice({ stripeInvoiceId: 'b', status: 'void' }),
        invoice({ stripeInvoiceId: 'c', status: 'open' }),
      ],
      now: NOW,
    });
    expect(result.rows.map((r) => r.stripeInvoiceId)).toEqual(['c']);
  });

  it('gives one USD total, because every partner is a US entity billed in USD', () => {
    const result = summarizeOutstanding({
      invoices: [
        invoice({ stripeInvoiceId: 'a', amountDue: 25000 }),
        invoice({ stripeInvoiceId: 'b', amountDue: 10000 }),
      ],
      now: NOW,
    });
    expect(result.total).toBe(35000);
    expect(result.currency).toBe('usd');
  });

  it('keeps a non-USD invoice OUT of the total and names it', () => {
    // USD-only is the stated reality, so a non-USD invoice is a data error, not
    // a currency feature. Silently summing it fabricates an exchange rate;
    // silently dropping it understates the debt. Neither is acceptable on a
    // money screen, so it is excluded from the total AND named.
    const result = summarizeOutstanding({
      invoices: [
        invoice({ stripeInvoiceId: 'a', currency: 'usd', amountDue: 25000 }),
        invoice({ stripeInvoiceId: 'b', currency: 'dop', amountDue: 500000 }),
      ],
      now: NOW,
    });
    expect(result.total).toBe(25000);
    expect(result.unexpectedCurrencies).toEqual(['dop']);
  });

  it('distinguishes "nothing outstanding" from "could not load"', () => {
    // A money screen that renders an unreadable state as zero owed is the
    // worst possible lie it can tell.
    const empty = summarizeOutstanding({ invoices: [], now: NOW });
    expect(empty.rows).toEqual([]);
    expect(empty.unavailable).toBe(false);

    const broken = summarizeOutstanding({ invoices: null, now: NOW });
    expect(broken.unavailable).toBe(true);
    expect(broken.total).toBeNull();
  });

  it('never derives paid state itself — it only reads what Stripe said', () => {
    // The referee rule: Stripe is the ledger. This module must not conclude an
    // invoice is settled because the numbers happen to look settled.
    const result = summarizeOutstanding({
      invoices: [invoice({ status: 'open', amountDue: 0 })],
      now: NOW,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('open');
  });
});

describe('summarizeOutstanding — sorting', () => {
  const older = invoice({ stripeInvoiceId: 'old_small', amountDue: 100, dueAt: '2026-05-01T00:00:00.000Z' });
  const newerBigger = invoice({ stripeInvoiceId: 'new_big', amountDue: 900000, dueAt: '2026-08-30T00:00:00.000Z' });

  it('defaults to age even when not asked', () => {
    // The default is what the screen shows on load, every load. It decides
    // which invoice someone actually chases.
    const result = summarizeOutstanding({ invoices: [newerBigger, older], now: NOW });
    expect(result.rows.map((r) => r.stripeInvoiceId)).toEqual(['old_small', 'new_big']);
    expect(result.sortBy).toBe('age');
  });

  it('sorts by amount when asked', () => {
    const result = summarizeOutstanding({ invoices: [older, newerBigger], now: NOW, sortBy: 'amount' });
    expect(result.rows.map((r) => r.stripeInvoiceId)).toEqual(['new_big', 'old_small']);
    expect(result.sortBy).toBe('amount');
  });

  it('falls back to age for a sort it does not recognise', () => {
    // Never silently render an unsorted list: the order of a money screen is
    // information, and an arbitrary one is a wrong answer that looks fine.
    const result = summarizeOutstanding({ invoices: [newerBigger, older], now: NOW, sortBy: 'nonsense' });
    expect(result.rows.map((r) => r.stripeInvoiceId)).toEqual(['old_small', 'new_big']);
    expect(result.sortBy).toBe('age');
  });
});
