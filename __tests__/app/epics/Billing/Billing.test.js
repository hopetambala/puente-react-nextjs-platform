import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('app/impacto-design-system', () => ({
  Panel: ({ title, children }) => <section><h3>{title}</h3>{children}</section>,
  Badge: ({ text }) => <span>{text}</span>,
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
  EmptyState: ({ title, description }) => <div><p>{title}</p><p>{description}</p></div>,
}));

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const Billing = require('app/epics/Billing/Billing').default;

const ORGS = [
  { shortCode: 'wof', name: 'WOF', plan: 'partner' },
  { shortCode: 'michigan', name: 'Michigan' },
];

describe('Billing — who owes what', () => {
  it('says nothing is outstanding when nothing is', () => {
    render(<Billing organizations={ORGS} invoices={[]} />);
    expect(screen.getByText('billing_nothing_outstanding')).toBeInTheDocument();
  });

  it('says the amount could NOT be read when the read failed', () => {
    // Distinct copy, deliberately. A money screen that renders an unreadable
    // state as "nothing owed" is the worst lie it can tell, and it looks
    // exactly like good news.
    render(<Billing organizations={ORGS} invoices={null} />);
    expect(screen.getByText('billing_outstanding_unavailable')).toBeInTheDocument();
    expect(screen.queryByText('billing_nothing_outstanding')).not.toBeInTheDocument();
  });

  it('lists an outstanding invoice with its organization and days overdue', () => {
    render(<Billing organizations={ORGS} invoices={[{
      stripeInvoiceId: 'in_1', organization: 'wof', currency: 'usd',
      amountDue: 25000, status: 'open', dueAt: '2026-08-01T00:00:00.000Z',
    }]} now={new Date('2026-08-31T00:00:00.000Z')} />);
    // WOF appears twice on purpose - once as an outstanding row, once in the
    // roster below - so this scopes to the invoice, which is unique.
    expect(screen.getByText('in_1')).toBeInTheDocument();
    expect(screen.getAllByText('WOF').length).toBeGreaterThan(0);
    // $250.00 renders twice: as the currency total and as the row amount.
    expect(screen.getAllByText(/\$250\.00/).length).toBe(2);
    expect(screen.getByText('billing_days_overdue')).toBeInTheDocument();
  });
});

describe('Billing — the organization roster', () => {
  it('shows each organization with its plan', () => {
    render(<Billing organizations={ORGS} invoices={[]} />);
    expect(screen.getByText('partner')).toBeInTheDocument();
  });

  it('flags an organization with no plan as not billable yet', () => {
    // 56 of 58 organizations have no plan. Rendering them as £0 or as billable
    // both hide the decision that has not been made.
    render(<Billing organizations={ORGS} invoices={[]} />);
    expect(screen.getByText('billing_no_plan')).toBeInTheDocument();
  });

  it('never renders a payment control — Stripe is the ledger', () => {
    render(<Billing organizations={ORGS} invoices={[{
      stripeInvoiceId: 'in_1', organization: 'wof', currency: 'usd',
      amountDue: 25000, status: 'open', dueAt: '2026-08-01T00:00:00.000Z',
    }]} />);
    expect(screen.queryByText(/billing_mark_paid/)).not.toBeInTheDocument();
  });
});
