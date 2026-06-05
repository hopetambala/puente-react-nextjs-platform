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

const mockCount = jest.fn().mockResolvedValue(0);
const mockDistinct = jest.fn().mockResolvedValue([]);

const mockQueryChain = {
  equalTo: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  descending: jest.fn().mockReturnThis(),
  greaterThanOrEqualTo: jest.fn().mockReturnThis(),
  lessThanOrEqualTo: jest.fn().mockReturnThis(),
  find: mockFind,
  count: mockCount,
  distinct: mockDistinct,
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
  Skeleton: ({ width, height }) => <span data-testid="skeleton" style={{ width, height }} />,
  SegmentedControl: ({ options, value, onChange }) => (
    <div data-testid="view-tabs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

// Sub-components are unit-tested in their own files; mock them here as sentinels
// so the orchestrator test focuses on orchestration (summary counts, fetch wiring).
jest.mock('app/epics/DataCurationManager/SourceSelector', () => () => <div data-testid="source-selector" />);
jest.mock('app/epics/DataCurationManager/FilterBar', () => () => <div data-testid="filter-bar" />);
jest.mock('app/epics/DataCurationManager/RecordsTable', () => ({ records }) => (
  <div data-testid="records-table">{records.length} rows</div>
));
jest.mock('app/epics/DataCurationManager/RecordInspector', () => () => <div data-testid="record-inspector" />);
jest.mock('app/epics/DataCurationManager/DuplicateResolver', () => () => <div data-testid="duplicate-resolver" />);
jest.mock('app/epics/DataCurationManager/CommunityAudit', () => () => <div data-testid="community-audit" />);

function makeRecord(overrides = {}) {
  const data = {
    objectId: 'r1',
    fname: 'Hope',
    lname: 'Tambala',
    dob: '01/01/1990',
    sex: 'female',
    householdId: 'HH01',
    surveyingUser: 'alice',
    communityname: 'Nsanje',
    telephoneNumber: '265999',
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
  mockCount.mockResolvedValue(0);
  mockDistinct.mockResolvedValue([]);
});

// ─── Pure function tests ──────────────────────────────────────────────────────

describe('computeSurveyCompleteness (8-field)', () => {
  const { computeSurveyCompleteness } = require('app/epics/DataCurationManager');

  it('returns 100 when all 8 key fields are present', () => {
    expect(computeSurveyCompleteness(makeRecord())).toBe(100);
  });

  it('returns 0 when all 8 key fields are empty', () => {
    const r = makeRecord({ fname: '', lname: '', dob: '', sex: '', householdId: '', surveyingUser: '', communityname: '', telephoneNumber: '' });
    expect(computeSurveyCompleteness(r)).toBe(0);
  });

  it('returns 75 when 6 of 8 fields are present', () => {
    const r = makeRecord({ dob: '', sex: '' });
    expect(computeSurveyCompleteness(r)).toBe(75);
  });
});

describe('computeFormResultsCompleteness', () => {
  const { computeFormResultsCompleteness } = require('app/epics/DataCurationManager');

  const mockFormDef = {
    get: (k) => ({
      fields: [
        { formikKey: 'water_source' },
        { formikKey: 'floor_material' },
      ],
    }[k]),
  };

  it('returns meta:100 when all 4 metadata fields present', () => {
    const r = makeRecord();
    r.get = (k) => ({
      surveyingUser: 'alice',
      surveyingOrganization: 'TestOrg',
      client: { id: 'hh1' },
      createdAt: new Date(),
      fields: [{ title: 'water_source', answer: 'Well' }, { title: 'floor_material', answer: 'Dirt' }],
    }[k]);
    const { meta } = computeFormResultsCompleteness(r, mockFormDef);
    expect(meta).toBe(100);
  });

  it('returns fields:50 when only 1 of 2 expected fields answered', () => {
    const r = makeRecord();
    r.get = (k) => ({
      surveyingUser: 'alice',
      surveyingOrganization: 'TestOrg',
      client: { id: 'hh1' },
      createdAt: new Date(),
      fields: [{ title: 'water_source', answer: 'Well' }],
    }[k]);
    const { fields } = computeFormResultsCompleteness(r, mockFormDef);
    expect(fields).toBe(50);
  });

  it('returns overall < 60 when most fields missing', () => {
    const r = makeRecord();
    r.get = (k) => ({
      surveyingUser: null,
      surveyingOrganization: null,
      client: null,
      createdAt: null,
      fields: [],
    }[k]);
    const { overall } = computeFormResultsCompleteness(r, mockFormDef);
    expect(overall).toBeLessThan(60);
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
    // 1 of 8 fields (only communityname) = 12%
    const r = makeRecord({ objectId: 'r1', fname: '', lname: '', dob: '', sex: '', householdId: '', surveyingUser: '', telephoneNumber: '' });
    const anomalies = flagAnomalies([r]);
    expect(anomalies.has('r1')).toBe(true);
  });

  it('does not flag record with completeness >= 60', () => {
    const r = makeRecord(); // 100%
    const anomalies = flagAnomalies([r]);
    expect(anomalies.has('r1')).toBe(false);
  });
});

// ─── Orchestration tests ──────────────────────────────────────────────────────

describe('Summary bar', () => {
  it('shows record count after fetch', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    mockCount.mockResolvedValue(1);
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
    const r = makeRecord({ objectId: 'r1', fname: '', lname: '', dob: '', sex: '', householdId: '', surveyingUser: '', telephoneNumber: '' });
    mockFind.mockResolvedValue([r]);
    render(<DataCurationManager />);
    await waitFor(() => expect(screen.getByText(/1.*anomalies/i)).toBeInTheDocument());
  });
});

describe('Orchestration', () => {
  it('renders SourceSelector, FilterBar, RecordsTable but NOT CommunityAudit in the default Records view', async () => {
    render(<DataCurationManager />);
    await waitFor(() => {
      expect(screen.getByTestId('source-selector')).toBeInTheDocument();
      expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
      expect(screen.getByTestId('records-table')).toBeInTheDocument();
      expect(screen.queryByTestId('community-audit')).not.toBeInTheDocument();
    });
  });

  it('scopes the Parse query to the user organization', async () => {
    mockFind.mockResolvedValue([makeRecord()]);
    render(<DataCurationManager />);
    await waitFor(() => expect(mockQueryChain.equalTo).toHaveBeenCalledWith('surveyingOrganization', 'TestOrg'));
  });

  it('passes fetched records to RecordsTable', async () => {
    mockFind.mockResolvedValue([makeRecord(), makeRecord({ objectId: 'r2' })]);
    render(<DataCurationManager />);
    await waitFor(() => expect(screen.getByText('2 rows')).toBeInTheDocument());
  });
});

describe('View tabs', () => {
  it('renders a Records tab and a Community Audit tab', async () => {
    render(<DataCurationManager />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /records/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /community audit/i })).toBeInTheDocument();
    });
  });

  it('shows the records view (FilterBar + RecordsTable) by default', async () => {
    render(<DataCurationManager />);
    await waitFor(() => {
      expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
      expect(screen.getByTestId('records-table')).toBeInTheDocument();
      expect(screen.queryByTestId('community-audit')).not.toBeInTheDocument();
    });
  });

  it('switches to Community Audit view when the Community Audit tab is clicked', async () => {
    render(<DataCurationManager />);
    await waitFor(() => screen.getByRole('button', { name: /community audit/i }));
    fireEvent.click(screen.getByRole('button', { name: /community audit/i }));
    await waitFor(() => {
      expect(screen.getByTestId('community-audit')).toBeInTheDocument();
      expect(screen.queryByTestId('records-table')).not.toBeInTheDocument();
    });
  });

  it('hides FilterBar and RecordsTable when Community Audit is active', async () => {
    render(<DataCurationManager />);
    await waitFor(() => screen.getByRole('button', { name: /community audit/i }));
    fireEvent.click(screen.getByRole('button', { name: /community audit/i }));
    await waitFor(() => {
      expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('records-table')).not.toBeInTheDocument();
    });
  });
});
