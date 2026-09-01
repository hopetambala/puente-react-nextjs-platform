import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('app/impacto-design-system', () => ({
  Panel: ({ title, children }) => <section><h3>{title}</h3>{children}</section>,
  // The REAL Badge takes `children`, not `text` - Button is the one that takes
  // `text`. Mocking it with the wrong API is how a badge that rendered
  // completely empty passed every test in this file.
  Badge: ({ children }) => <span>{children}</span>,
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
  // The REAL EmptyState takes `message` and `sub`, not title/description.
  // Mocking the wrong API is how a required prop stayed undefined in production
  // while every test passed - the same trap Badge set earlier in this epic.
  EmptyState: ({ message, sub }) => <div><p>{message}</p><p>{sub}</p></div>,
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
    expect(screen.getByText('billing_days_overdue_other')).toBeInTheDocument();
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

describe('Billing — sorting is a deliberate act', () => {
  const INVOICES = [
    { stripeInvoiceId: 'old_small', organization: 'wof', currency: 'usd', amountDue: 100, status: 'open', dueAt: '2026-05-01T00:00:00.000Z' },
    { stripeInvoiceId: 'new_big', organization: 'michigan', currency: 'usd', amountDue: 900000, status: 'open', dueAt: '2026-08-30T00:00:00.000Z' },
  ];
  const NOW = new Date('2026-08-31T00:00:00.000Z');

  it('opens sorted by age, oldest debt first', () => {
    render(<Billing organizations={ORGS} invoices={INVOICES} now={NOW} />);
    const ids = screen.getAllByTestId('invoice-id').map((n) => n.textContent);
    expect(ids).toEqual(['old_small', 'new_big']);
  });

  it('re-sorts by amount when the control is used', () => {
    render(<Billing organizations={ORGS} invoices={INVOICES} now={NOW} />);
    fireEvent.click(screen.getByText('billing_sort_amount'));
    const ids = screen.getAllByTestId('invoice-id').map((n) => n.textContent);
    expect(ids).toEqual(['new_big', 'old_small']);
  });

  it('warns when an invoice is not in USD instead of hiding or summing it', () => {
    render(<Billing organizations={ORGS} now={NOW} invoices={[
      ...INVOICES,
      { stripeInvoiceId: 'dop_one', organization: 'wof', currency: 'dop', amountDue: 500000, status: 'open', dueAt: '2026-08-01T00:00:00.000Z' },
    ]} />);
    expect(screen.getByText('billing_unexpected_currency')).toBeInTheDocument();
  });
});

describe('Billing — one day is not "1 days"', () => {
  // The locale codes here are eng/spa/hat, not BCP-47 en/es/ht. i18next resolves
  // plurals through Intl.PluralRules, which does not recognise three-letter
  // codes - so it can never select the _one form and everything falls to
  // _other. The count is therefore branched explicitly rather than delegated,
  // because "1 days overdue" appears on a document a partner reads.
  const one = [{
    stripeInvoiceId: 'in_1', organization: 'wof', currency: 'usd',
    amountDue: 100, status: 'open', dueAt: '2026-08-30T00:00:00.000Z',
  }];

  it('uses the singular key for exactly one day', () => {
    render(<Billing organizations={ORGS} invoices={one} now={new Date('2026-08-31T00:00:00.000Z')} />);
    expect(screen.getByText('billing_days_overdue_one')).toBeInTheDocument();
  });

  it('uses the plural key for more than one', () => {
    render(<Billing organizations={ORGS} invoices={one} now={new Date('2026-12-31T00:00:00.000Z')} />);
    expect(screen.getByText('billing_days_overdue_other')).toBeInTheDocument();
  });
});

describe('Billing — staff can set plan and billing contact', () => {
  const ORG = [{ shortCode: 'wof', name: 'WOF', plan: 'partner', billingEmail: 'pay@wof.org' }];

  it('shows the billing contact, not just the plan', () => {
    render(<Billing organizations={ORG} invoices={[]} onSaveOrg={jest.fn()} />);
    expect(screen.getByDisplayValue('pay@wof.org')).toBeInTheDocument();
  });

  it('saves a changed billing contact for that organization only', async () => {
    const onSaveOrg = jest.fn().mockResolvedValue({});
    render(<Billing organizations={ORG} invoices={[]} onSaveOrg={onSaveOrg} />);
    fireEvent.change(screen.getByDisplayValue('pay@wof.org'), { target: { value: 'new@wof.org' } });
    fireEvent.click(within(screen.getByTestId('save-org:wof')).getByRole('button'));
    await waitFor(() => expect(onSaveOrg).toHaveBeenCalled());
    expect(onSaveOrg.mock.calls[0][0]).toMatchObject({
      shortCode: 'wof', billingEmail: 'new@wof.org',
    });
  });

  it('shows an organization with no contact as empty, not as a guess', () => {
    render(<Billing organizations={[{ shortCode: 'michigan', name: 'Michigan' }]} invoices={[]} onSaveOrg={jest.fn()} />);
    const field = screen.getByPlaceholderText('billing_email_placeholder');
    expect(field.value).toBe('');
  });

  it('surfaces a failed save rather than implying it worked', async () => {
    const onSaveOrg = jest.fn().mockRejectedValue(new Error('requires the puente_staff role'));
    render(<Billing organizations={ORG} invoices={[]} onSaveOrg={onSaveOrg} />);
    fireEvent.click(within(screen.getByTestId('save-org:wof')).getByRole('button'));
    await waitFor(() => expect(screen.getByText(/puente_staff/)).toBeInTheDocument());
  });
});

describe('Billing — creating an invoice', () => {
  const ORG = [{ shortCode: 'wof', name: 'WOF', plan: 'partner', billingEmail: 'pay@wof.org' }];

  it('disables the create button while Stripe is not configured, and says why', () => {
    // A control that errors when pressed teaches nothing. A disabled one with a
    // reason tells the operator what is missing and that the workflow exists.
    render(<Billing organizations={ORG} invoices={[]} stripeConfigured={false} />);
    const btn = within(screen.getByTestId('create-invoice:wof')).getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByText('billing_stripe_not_configured')).toBeInTheDocument();
  });

  it('enables it once Stripe is configured', () => {
    render(<Billing organizations={ORG} invoices={[]} stripeConfigured />);
    expect(within(screen.getByTestId('create-invoice:wof')).getByRole('button')).not.toBeDisabled();
  });

  it('never offers to invoice an organization with no plan', () => {
    // The composer would refuse it anyway; offering the button invites a click
    // that can only fail.
    render(<Billing organizations={[{ shortCode: 'michigan', name: 'Michigan' }]} invoices={[]} stripeConfigured />);
    expect(screen.queryByTestId('create-invoice:michigan')).not.toBeInTheDocument();
  });
});
