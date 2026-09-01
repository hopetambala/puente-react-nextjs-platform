import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('app/impacto-design-system', () => ({
  Panel: ({ title, children }) => <section><h3>{title}</h3>{children}</section>,
  Badge: ({ children }) => <span>{children}</span>,
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
}));
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const RateCardPanel = require('app/epics/Billing/RateCardPanel').default;

const CARD = {
  currency: 'usd',
  netTermsDays: 30,
  plans: { partner: 15000 },
  services: { 'custom-form-build': 200000 },
};

describe('RateCardPanel', () => {
  it('shows prices in dollars, because nobody thinks in cents', async () => {
    render(<RateCardPanel card={CARD} onSave={jest.fn()} />);
    expect(screen.getByDisplayValue('150.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2000.00')).toBeInTheDocument();
  });

  it('saves in integer cents, not the dollars it displayed', async () => {
    // The single most dangerous conversion on the screen. Sending 150 instead
    // of 15000 undercharges every partner by 100x, and nothing downstream
    // would flag it as wrong.
    const onSave = jest.fn().mockResolvedValue({});
    render(<RateCardPanel card={CARD} onSave={onSave} />);
    fireEvent.change(screen.getByDisplayValue('150.00'), { target: { value: '175.50' } });
    fireEvent.click(screen.getByText('billing_rate_card_save'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].plans.partner).toBe(17550);
  });

  it('refuses to save a price it cannot parse, rather than sending zero', async () => {
    const onSave = jest.fn();
    render(<RateCardPanel card={CARD} onSave={onSave} />);
    fireEvent.change(screen.getByDisplayValue('150.00'), { target: { value: 'free' } });
    fireEvent.click(screen.getByText('billing_rate_card_save'));
    await waitFor(() => expect(screen.getByText(/billing_rate_card_invalid/)).toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('surfaces a failed save instead of implying it worked', async () => {
    // If the write fails and the screen says nothing, the operator believes the
    // new rate is live and the next invoice quietly uses the old one.
    const onSave = jest.fn().mockRejectedValue(new Error('requires the puente_staff role'));
    render(<RateCardPanel card={CARD} onSave={onSave} />);
    fireEvent.click(screen.getByText('billing_rate_card_save'));
    await waitFor(() => expect(screen.getByText(/puente_staff/)).toBeInTheDocument());
  });

  it('says the card could not be read rather than showing every price as zero', async () => {
    render(<RateCardPanel card={null} onSave={jest.fn()} />);
    expect(screen.getByText('billing_rate_card_unavailable')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('0.00')).not.toBeInTheDocument();
  });
});

describe('RateCardPanel — the card arrives after the first render', () => {
  it('shows the prices once the card loads, not just when it is there on mount', async () => {
    // The page renders before the network answers, so this panel's FIRST render
    // always has card=null. Deriving the draft with useState(() => ...) runs the
    // initializer once and never again, so the fields stayed empty forever and
    // the screen claimed the card could not be read - while the request had in
    // fact returned 200 with every price.
    const { rerender } = render(<RateCardPanel card={null} onSave={jest.fn()} />);
    expect(screen.getByText('billing_rate_card_unavailable')).toBeInTheDocument();

    rerender(<RateCardPanel card={CARD} onSave={jest.fn()} />);
    await waitFor(() => expect(screen.getByDisplayValue('150.00')).toBeInTheDocument());
    expect(screen.queryByText('billing_rate_card_unavailable')).not.toBeInTheDocument();
  });
});

describe('RateCardPanel — staff can add and remove lines', () => {
  it('adds a new service at a price', async () => {
    const onSave = jest.fn().mockResolvedValue({});
    render(<RateCardPanel card={CARD} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText('billing_rate_card_new_code'), {
      target: { value: 'translation' },
    });
    fireEvent.change(screen.getByPlaceholderText('billing_rate_card_new_price'), {
      target: { value: '750.00' },
    });
    fireEvent.click(screen.getByText('billing_rate_card_add'));
    fireEvent.click(screen.getByText('billing_rate_card_save'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].services.translation).toBe(75000);
  });

  it('refuses to add a code that already exists', async () => {
    // Silently overwriting an existing price with a new one typed into the ADD
    // field is how a rate changes without anyone deciding to change it.
    render(<RateCardPanel card={CARD} onSave={jest.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('billing_rate_card_new_code'), {
      target: { value: 'custom-form-build' },
    });
    fireEvent.change(screen.getByPlaceholderText('billing_rate_card_new_price'), {
      target: { value: '1.00' },
    });
    fireEvent.click(screen.getByText('billing_rate_card_add'));
    expect(screen.getByText(/billing_rate_card_duplicate/)).toBeInTheDocument();
  });

  it('removes a service', async () => {
    const onSave = jest.fn().mockResolvedValue({});
    render(<RateCardPanel card={CARD} onSave={onSave} />);
    // The design-system Button does not forward data-testid, so the id lives on
    // a wrapping span - and clicking a span does not fire the button's onClick.
    // Second time this exact trap has bitten in this epic.
    fireEvent.click(within(screen.getByTestId('remove-service:custom-form-build')).getByRole('button'));
    fireEvent.click(screen.getByText('billing_rate_card_save'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].services['custom-form-build']).toBeUndefined();
  });

  it('never lets the last PLAN be removed', async () => {
    // An organization on a plan the card no longer prices becomes unbillable,
    // and the composer refuses it with a message about the rate card rather
    // than about the removal that caused it.
    render(<RateCardPanel card={CARD} onSave={jest.fn()} />);
    expect(screen.queryByTestId('remove-plan:partner')).not.toBeInTheDocument();
  });
});
