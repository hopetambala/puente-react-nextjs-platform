import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

// ─── RED: raw h1 in FormMarketplace epic (audit F-02) ────────────────────────
// If the <h1>Form Marketplace</h1> is ever restored, or a raw heading element
// appears inside the epic, this test catches it — heading belongs in the page's
// PageHeader, not buried inside the epic.

// ─── RED: p.emptyState instead of EmptyState component ───────────────────────
// If the empty-state paragraph is changed back to a raw <p>, the testid
// disappears and the design system's EmptyState styling is bypassed.

const mockRetrieve = jest.fn();

jest.mock('app/epics/FormMarketplace/_data', () => ({
  __esModule: true,
  default: (...args) => mockRetrieve(...args),
}));

jest.mock('app/impacto-design-system', () => ({
  CardAlt: ({ title, description }) => (
    <div data-testid="card">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  Spinner: () => <div data-testid="spinner" />,
  EmptyState: ({ message }) => <p data-testid="empty-state">{message}</p>,
}));

const FormMarketplace = require('app/epics/FormMarketplace').default;

const mockContext = { addPropToStore: jest.fn(), store: {} };
const mockRouter = { push: jest.fn() };

function renderMarketplace(records = []) {
  mockRetrieve.mockResolvedValueOnce(records);
  return render(<FormMarketplace context={mockContext} router={mockRouter} />);
}

beforeEach(() => jest.clearAllMocks());

describe('No raw heading in epic', () => {
  it('does not render a raw h1', async () => {
    renderMarketplace([]);
    await waitFor(() => expect(mockRetrieve).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('does not render a raw h2', async () => {
    renderMarketplace([]);
    await waitFor(() => expect(mockRetrieve).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });
});

describe('Empty state', () => {
  it('shows EmptyState component when no forms are available', async () => {
    renderMarketplace([]);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
  });
});

describe('Form cards', () => {
  it('renders a card for each form spec', async () => {
    renderMarketplace([
      { objectId: '1', name: 'WaSH Survey', description: 'Water survey' },
      { objectId: '2', name: 'Vitals Form', description: 'Health vitals' },
    ]);
    await waitFor(() => expect(screen.getByText('WaSH Survey')).toBeInTheDocument());
    expect(screen.getByText('Vitals Form')).toBeInTheDocument();
    expect(screen.getAllByTestId('card')).toHaveLength(2);
  });

  it('shows loading spinner before data resolves', () => {
    mockRetrieve.mockReturnValueOnce(new Promise(() => {}));
    render(<FormMarketplace context={mockContext} router={mockRouter} />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});
