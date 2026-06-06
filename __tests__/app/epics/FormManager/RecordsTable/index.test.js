import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── RED: RecordsTable not yet implemented ────────────────────────────────────
// These tests will fail until app/epics/FormManager/RecordsTable/index.js exists
// and FormManager wires the drill-in view.

jest.mock('app/impacto-design-system', () => ({
  Badge: ({ children, variant }) => (
    <span data-testid={`badge-${variant}`}>{children}</span>
  ),
  EmptyState: ({ message }) => <p data-testid="empty-state">{message}</p>,
  Spinner: () => <div data-testid="spinner" />,
}));

jest.mock('app/services/parse', () => ({
  default: {
    Query: jest.fn(),
  },
}));

// Parse is mocked at the module level so each test can configure the mock Query
jest.mock('parse', () => {
  const mockFind = jest.fn();
  const MockQuery = jest.fn().mockImplementation(() => ({
    equalTo: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue(0),
    find: mockFind,
  }));
  MockQuery._mockFind = mockFind;
  return { Query: MockQuery };
});

const Parse = require('parse');
const RecordsTable = require('app/epics/FormManager/RecordsTable').default;

beforeEach(() => {
  jest.clearAllMocks();
});

const makeRecord = (overrides = {}) => ({
  id: 'EH-001',
  get: (key) => ({
    objectId: 'EH-001',
    household: 'Sabana Yegua · Block 4',
    surveyingUser: 'Marcos D.',
    createdAt: new Date('2025-05-14T09:42:00').toISOString(),
    syncStatus: 'synced',
    waterSource: 'Bottled',
    ...overrides,
  })[key],
  id: overrides.id || 'EH-001',
});

const defaultForm = {
  objectId: 'form-abc',
  name: 'Environmental Health',
};

function renderTable(props = {}) {
  return render(
    <RecordsTable form={defaultForm} {...props} />,
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────

describe('RecordsTable — loading', () => {
  it('shows a spinner while fetching', () => {
    Parse.Query._mockFind.mockReturnValue(new Promise(() => {})); // never resolves
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnValue(new Promise(() => {})),
      find: Parse.Query._mockFind,
    }));
    renderTable();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});

// ─── Column headers ────────────────────────────────────────────────────────────

describe('RecordsTable — column headers', () => {
  beforeEach(() => {
    Parse.Query._mockFind.mockResolvedValue([]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find: Parse.Query._mockFind,
    }));
  });

  it('renders Record ID column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('Record')).toBeInTheDocument());
  });

  it('renders Household column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('Household')).toBeInTheDocument());
  });

  it('renders Surveyor column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('Surveyor')).toBeInTheDocument());
  });

  it('renders Submitted column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('Submitted')).toBeInTheDocument());
  });

  it('renders Status column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('Status')).toBeInTheDocument());
  });

  it('renders Water source column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('Water source')).toBeInTheDocument());
  });
});

// ─── Record rows ───────────────────────────────────────────────────────────────

describe('RecordsTable — record rows', () => {
  const records = [
    makeRecord({ id: 'EH-218', household: 'Sabana Yegua · Block 4', syncStatus: 'synced', waterSource: 'Bottled' }),
    makeRecord({ id: 'EH-216', household: 'Sabana Yegua · Block 3', syncStatus: 'conflict', waterSource: '—' }),
  ];

  beforeEach(() => {
    Parse.Query._mockFind.mockResolvedValue(records);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(2),
      find: Parse.Query._mockFind,
    }));
  });

  it('renders a row for each record', async () => {
    renderTable();
    await waitFor(() => {
      expect(screen.getByText('EH-218')).toBeInTheDocument();
      expect(screen.getByText('EH-216')).toBeInTheDocument();
    });
  });

  it('renders a green Synced badge for synced records', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('badge-green')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('badge-green')).toHaveTextContent('Synced');
  });

  it('renders an orange Conflict badge for conflict records', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('badge-orange')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('badge-orange')).toHaveTextContent('Conflict');
  });

  it('renders the household for each row', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByText('Sabana Yegua · Block 4')).toBeInTheDocument(),
    );
  });

  it('renders the water source for each row', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByText('Bottled')).toBeInTheDocument(),
    );
  });
});

// ─── Parse query wiring ────────────────────────────────────────────────────────

describe('RecordsTable — Parse query', () => {
  it('queries SurveyData class filtered by the form objectId', async () => {
    Parse.Query._mockFind.mockResolvedValue([]);
    const equalToMock = jest.fn().mockReturnThis();
    Parse.Query.mockImplementation(() => ({
      equalTo: equalToMock,
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find: Parse.Query._mockFind,
    }));

    renderTable();

    await waitFor(() => {
      expect(Parse.Query).toHaveBeenCalledWith('SurveyData');
      expect(equalToMock).toHaveBeenCalledWith('formSpecification', 'form-abc');
    });
  });
});

// ─── Empty state ───────────────────────────────────────────────────────────────

describe('RecordsTable — empty state', () => {
  it('shows an empty state when there are no records', async () => {
    Parse.Query._mockFind.mockResolvedValue([]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find: Parse.Query._mockFind,
    }));
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument(),
    );
  });
});

// ─── Submitted date — bug: record.get('createdAt') vs record.createdAt ────────

describe('RecordsTable — submitted date', () => {
  it('shows a formatted submitted date from record.createdAt', async () => {
    // createdAt is a direct property on the Parse object, NOT in the .get() map
    const record = {
      id: 'EH-300',
      createdAt: new Date('2025-05-14'),
      get: (key) => ({
        household: 'Sabana Yegua · Block 1',
        surveyingUser: 'Ana R.',
        syncStatus: 'synced',
        waterSource: 'Tap',
      })[key],
    };

    Parse.Query._mockFind.mockResolvedValue([record]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(1),
      find: Parse.Query._mockFind,
    }));

    renderTable();

    await waitFor(() =>
      expect(
        screen.getByText(new Date('2025-05-14').toLocaleDateString()),
      ).toBeInTheDocument(),
    );
  });
});

// ─── Pagination ────────────────────────────────────────────────────────────────

describe('RecordsTable — pagination', () => {
  beforeEach(() => {
    const records = Array.from({ length: 20 }, (_, i) =>
      makeRecord({ id: `EH-${100 + i}`, household: `Block ${i}`, syncStatus: 'synced', waterSource: 'Tap' }),
    );
    Parse.Query._mockFind.mockResolvedValue(records);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(100),
      find: Parse.Query._mockFind,
    }));
  });

  it('shows a "Showing X–Y of Z" summary', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByText(/Showing 1/)).toBeInTheDocument(),
    );
  });

  it('renders a Next page button', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument(),
    );
  });

  it('renders a Previous page button', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument(),
    );
  });

  it('Previous button is disabled on the first page', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled(),
    );
  });

  it('clicking Next re-fetches the next page', async () => {
    renderTable();
    await waitFor(() => screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(Parse.Query._mockFind).toHaveBeenCalledTimes(2);
    });
  });
});
