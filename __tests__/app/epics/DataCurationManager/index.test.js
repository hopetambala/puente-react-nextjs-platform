import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      data_curation_records: 'records',
      data_curation_avg: 'avg completeness',
      data_curation_dups: 'duplicates',
      data_curation_anomalies: 'anomalies',
      data_curation_edit: 'Edit',
      data_curation_save: 'Save',
    }[key] ?? key),
  }),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => ({
    get: (key) => ({ organization: 'TestOrg' }[key] ?? null),
  })),
}));

const mockSave = jest.fn().mockResolvedValue({});
const mockSet = jest.fn();
const mockFind = jest.fn().mockResolvedValue([]);

const mockQueryChain = {
  equalTo: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  find: mockFind,
};

jest.mock('parse', () => ({
  Parse: {
    Query: jest.fn(() => mockQueryChain),
    Object: { extend: jest.fn(() => ({})) },
  },
}));

jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children }) => <div data-testid="appshell">{children}</div>,
  PageHeader: ({ title }) => <h1>{title}</h1>,
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
}));

function makeRecord(overrides = {}) {
  const data = {
    objectId: 'r1',
    fname: 'Hope',
    lname: 'Tambala',
    householdId: 'HH01',
    surveyingUser: 'alice',
    communityname: 'Nsanje',
    createdAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
  return {
    id: data.objectId,
    get: (key) => data[key],
    set: mockSet,
    save: mockSave,
    createdAt: data.createdAt,
  };
}

const DataCurationManager = require('app/epics/DataCurationManager').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockResolvedValue([]);
});

// ─── Pure function tests ──────────────────────────────────────────────────────

describe('computeCompleteness', () => {
  const { computeCompleteness } = require('app/epics/DataCurationManager');

  it('returns 100 when all 5 key fields are present', () => {
    expect(computeCompleteness(makeRecord())).toBe(100);
  });

  it('returns 0 when all 5 key fields are empty', () => {
    const r = makeRecord({ fname: '', lname: '', householdId: '', surveyingUser: '', communityname: '' });
    expect(computeCompleteness(r)).toBe(0);
  });

  it('returns 60 when 3 of 5 fields are present', () => {
    const r = makeRecord({ householdId: '', surveyingUser: '' });
    expect(computeCompleteness(r)).toBe(60);
  });
});

describe('detectDuplicates', () => {
  const { detectDuplicates } = require('app/epics/DataCurationManager');

  it('returns empty set when no duplicates', () => {
    const records = [
      makeRecord({ objectId: 'r1', householdId: 'HH01', createdAt: new Date('2026-06-01T10:00:00Z') }),
      makeRecord({ objectId: 'r2', householdId: 'HH02', createdAt: new Date('2026-06-01T10:00:00Z') }),
    ];
    expect(detectDuplicates(records).size).toBe(0);
  });

  it('flags both records when same householdId on same day', () => {
    const day = new Date('2026-06-01T10:00:00Z');
    const records = [
      makeRecord({ objectId: 'r1', householdId: 'HH01', createdAt: day }),
      makeRecord({ objectId: 'r2', householdId: 'HH01', createdAt: day }),
    ];
    const dups = detectDuplicates(records);
    expect(dups.has('r1')).toBe(true);
    expect(dups.has('r2')).toBe(true);
  });
});

describe('flagAnomalies', () => {
  const { flagAnomalies } = require('app/epics/DataCurationManager');

  it('flags record with completeness < 60', () => {
    const r = makeRecord({ objectId: 'r1', fname: '', lname: '', householdId: '', surveyingUser: '' });
    // communityname present = 1/5 = 20%
    const anomalies = flagAnomalies([r]);
    expect(anomalies.has('r1')).toBe(true);
  });

  it('does not flag record with completeness >= 60', () => {
    const r = makeRecord(); // 100%
    const anomalies = flagAnomalies([r]);
    expect(anomalies.has('r1')).toBe(false);
  });
});

// ─── Component tests ──────────────────────────────────────────────────────────

describe('Summary bar', () => {
  it('shows record count', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => expect(screen.getByText(/1.*records/i)).toBeInTheDocument());
  });

  it('shows avg completeness', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => expect(screen.getByText(/100%.*avg completeness/i)).toBeInTheDocument());
  });

  it('shows duplicate count', async () => {
    const day = new Date('2026-06-01');
    mockFind.mockResolvedValue([
      makeRecord({ objectId: 'r1', householdId: 'HH01', createdAt: day }),
      makeRecord({ objectId: 'r2', householdId: 'HH01', createdAt: day }),
    ]);
    render(<DataCurationManager />);
    await waitFor(() => expect(screen.getByText(/2.*duplicates/i)).toBeInTheDocument());
  });

  it('shows anomaly count', async () => {
    const r = makeRecord({ objectId: 'r1', fname: '', lname: '', householdId: '', surveyingUser: '' });
    mockFind.mockResolvedValue([r]);
    render(<DataCurationManager />);
    await waitFor(() => expect(screen.getByText(/1.*anomalies/i)).toBeInTheDocument());
  });
});

describe('Records table', () => {
  it('renders table with Surveyor, Submitted, Completeness columns', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => {
      expect(screen.getByText('Surveyor')).toBeInTheDocument();
      expect(screen.getByText('Submitted')).toBeInTheDocument();
      expect(screen.getByText('Completeness')).toBeInTheDocument();
    });
  });
});

describe('Edit panel', () => {
  it('opens edit panel on row click showing field inputs', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByText('alice'));
    fireEvent.click(screen.getByText('alice').closest('tr'));
    await waitFor(() => expect(screen.getByLabelText('fname')).toBeInTheDocument());
  });

  it('pre-fills inputs with current field values', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByText('alice'));
    fireEvent.click(screen.getByText('alice').closest('tr'));
    await waitFor(() => expect(screen.getByLabelText('fname')).toHaveValue('Hope'));
  });

  it('calls record.set and record.save on Save', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByText('alice'));
    fireEvent.click(screen.getByText('alice').closest('tr'));
    await waitFor(() => screen.getByLabelText('fname'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
  });

  it('closes edit panel on Cancel', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByText('alice'));
    fireEvent.click(screen.getByText('alice').closest('tr'));
    await waitFor(() => screen.getByLabelText('fname'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByLabelText('fname')).not.toBeInTheDocument();
  });
});
