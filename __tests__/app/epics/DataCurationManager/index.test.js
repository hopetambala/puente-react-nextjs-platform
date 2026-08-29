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
  containedIn: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  descending: jest.fn().mockReturnThis(),
  greaterThanOrEqualTo: jest.fn().mockReturnThis(),
  lessThanOrEqualTo: jest.fn().mockReturnThis(),
  include: jest.fn().mockReturnThis(),
  find: mockFind,
  count: mockCount,
  distinct: mockDistinct,
};

// Scope resolution has its own tests; here it would just add a Parse read to
// every case. Returns the account's own string, which is the no-alias case.
jest.mock('app/modules/organization', () => ({
  ...jest.requireActual('app/modules/organization'),
  loadOrganizationScope: (Parse, org) => Promise.resolve([org]),
}));

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
jest.mock('app/epics/DataCurationManager/SourceSelector', () => ({ onChange }) => (
  // Expose onChange so orchestration tests can switch data source and assert
  // which Parse class the resulting query is built against.
  <div data-testid="source-selector">
    {['survey-data', 'env-health', 'eval-medical', 'vitals'].map((v) => (
      <button key={v} type="button" onClick={() => onChange(v)}>{`source:${v}`}</button>
    ))}
  </div>
));
jest.mock('app/epics/DataCurationManager/FilterBar', () => ({ onFilterChange }) => (
  // Expose onFilterChange so tests can set a filter and assert what survives a
  // source change.
  <div data-testid="filter-bar">
    <button type="button" onClick={() => onFilterChange({ community: 'Nsanje' })}>set community filter</button>
    <button type="button" onClick={() => onFilterChange({ completeness: 'high' })}>filter to high completeness</button>
  </div>
));
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
const { Parse: MockParse } = require('parse');

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
    // containedIn now: an organization's records are spread across every string
    // it has been called, and equalTo hid the rest with no error.
    await waitFor(() => expect(mockQueryChain.containedIn)
      .toHaveBeenCalledWith('surveyingOrganization', ['TestOrg']));
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

// ─── Parse class resolution ───────────────────────────────────────────────────
//
// Every source in SourceSelector must resolve to a class that actually exists in
// schema/schema.json. A non-existent class does not error in Parse — it returns
// zero rows, which reads to a coordinator as "no data collected" rather than
// "wrong class name". These tests assert the query is built against the real
// class, so that failure mode cannot come back silently.

describe('Parse class resolution', () => {
  async function selectSource(value) {
    render(<DataCurationManager />);
    await waitFor(() => screen.getByTestId('source-selector'));
    fireEvent.click(screen.getByRole('button', { name: `source:${value}` }));
  }

  it('queries HistoryEnvironmentalHealth for the env-health source', async () => {
    await selectSource('env-health');
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('HistoryEnvironmentalHealth'));
  });

  it('never queries the non-existent EnvironmentalHealth class', async () => {
    await selectSource('env-health');
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('HistoryEnvironmentalHealth'));
    expect(MockParse.Query).not.toHaveBeenCalledWith('EnvironmentalHealth');
  });

  it('queries SurveyData for the survey-data source', async () => {
    await selectSource('survey-data');
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('SurveyData'));
  });

  it('queries EvaluationMedical for the eval-medical source', async () => {
    await selectSource('eval-medical');
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('EvaluationMedical'));
  });

  it('queries Vitals for the vitals source', async () => {
    await selectSource('vitals');
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('Vitals'));
  });
});

// ─── Per-source completeness ──────────────────────────────────────────────────
//
// SURVEY_COMPLETENESS_FIELDS scores 8 SurveyData fields. Only one of them
// (surveyingUser) exists on Vitals / EvaluationMedical / HistoryEnvironmentalHealth
// — those classes reach the person via a `client` pointer. Scoring them with the
// SurveyData list rated every such record 13% and tripped the <60% anomaly
// threshold, so the summary bar reported an anomaly count equal to the row count.
// Each source is scored against the fields its own class actually carries.

function fieldRecord(id, data) {
  return { id, get: (k) => data[k], createdAt: new Date('2026-06-01T10:00:00Z') };
}

const FULL_VITALS = {
  bloodPressure: '120/80', pulse: '70', temp: '36.8', weight: '70', height: '170', respRate: '16',
};
const FULL_EVAL_MEDICAL = {
  AssessmentandEvaluation: 'stable', part_of_body: 'knee', duration: '3 months',
  condition_progression: 'improving', planOfAction: 'physio',
};
const FULL_ENV_HEALTH = {
  houseMaterial: 'block', waterAccess: 'piped', bathroomAccess: 'yes',
  electricityAccess: 'yes', foodSecurity: 'secure', latrineAccess: 'yes',
};

describe('summary bar scores completeness per source', () => {
  async function renderAtSource(value, records) {
    mockFind.mockResolvedValue(records);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByTestId('source-selector'));
    fireEvent.click(screen.getByRole('button', { name: `source:${value}` }));
  }

  it('reports 100% avg completeness for a fully populated vitals record', async () => {
    await renderAtSource('vitals', [fieldRecord('v1', FULL_VITALS)]);
    await waitFor(() => expect(screen.getByText(/100%.*avg completeness/i)).toBeInTheDocument());
  });

  it('reports zero anomalies for a fully populated vitals record', async () => {
    await renderAtSource('vitals', [fieldRecord('v1', FULL_VITALS)]);
    await waitFor(() => expect(screen.getByText(/0 anomalies/i)).toBeInTheDocument());
  });

  it('reports 100% avg completeness for a fully populated eval-medical record', async () => {
    await renderAtSource('eval-medical', [fieldRecord('e1', FULL_EVAL_MEDICAL)]);
    await waitFor(() => expect(screen.getByText(/100%.*avg completeness/i)).toBeInTheDocument());
  });

  it('reports 100% avg completeness for a fully populated env-health record', async () => {
    await renderAtSource('env-health', [fieldRecord('h1', FULL_ENV_HEALTH)]);
    await waitFor(() => expect(screen.getByText(/100%.*avg completeness/i)).toBeInTheDocument());
  });

  it('still scores survey-data against the SurveyData field list', async () => {
    await renderAtSource('survey-data', [makeRecord()]);
    await waitFor(() => expect(screen.getByText(/100%.*avg completeness/i)).toBeInTheDocument());
  });
});

describe('flagAnomalies (source-aware)', () => {
  const { flagAnomalies } = require('app/epics/DataCurationManager');

  it('does not flag a fully populated vitals record', () => {
    expect(flagAnomalies([fieldRecord('v1', FULL_VITALS)], 'vitals').has('v1')).toBe(false);
  });

  it('flags a vitals record with only one of six readings', () => {
    expect(flagAnomalies([fieldRecord('v2', { pulse: '70' })], 'vitals').has('v2')).toBe(true);
  });

  it('defaults to the SurveyData field list when no source is passed', () => {
    const sparse = makeRecord({ objectId: 'r1', fname: '', lname: '', dob: '', sex: '', householdId: '', surveyingUser: '', telephoneNumber: '' });
    expect(flagAnomalies([sparse]).has('r1')).toBe(true);
  });
});

// ─── Pointer inclusion ────────────────────────────────────────────────────────
//
// Vitals / EvaluationMedical / HistoryEnvironmentalHealth / FormResults carry no
// person or community fields of their own — they point at SurveyData via `client`.
// Without include(), that pointer arrives unfetched and every read through it
// returns undefined, so the Name and Community columns rendered "—" on every row.

describe('client pointer inclusion', () => {
  async function selectSource(value) {
    render(<DataCurationManager />);
    await waitFor(() => screen.getByTestId('source-selector'));
    fireEvent.click(screen.getByRole('button', { name: `source:${value}` }));
  }

  it('includes the client pointer for vitals', async () => {
    await selectSource('vitals');
    await waitFor(() => expect(mockQueryChain.include).toHaveBeenCalledWith('client'));
  });

  it('includes the client pointer for eval-medical', async () => {
    await selectSource('eval-medical');
    await waitFor(() => expect(mockQueryChain.include).toHaveBeenCalledWith('client'));
  });

  it('includes the client pointer for env-health', async () => {
    await selectSource('env-health');
    await waitFor(() => expect(mockQueryChain.include).toHaveBeenCalledWith('client'));
  });

  it('does not include client for survey-data, where people are the records', async () => {
    render(<DataCurationManager />);
    await waitFor(() => expect(mockFind).toHaveBeenCalled());
    expect(mockQueryChain.include).not.toHaveBeenCalledWith('client');
  });
});

// ─── Filter reset on source change ────────────────────────────────────────────
//
// communityname exists only on SurveyData. A community filter left over from
// People Records was still applied after switching to a class that has no such
// field, which matches zero rows and returns an empty table with no error.

describe('filter reset on source change', () => {
  it('drops the community filter when the source changes', async () => {
    render(<DataCurationManager />);
    await waitFor(() => screen.getByTestId('filter-bar'));

    fireEvent.click(screen.getByRole('button', { name: 'set community filter' }));
    await waitFor(() => expect(mockQueryChain.equalTo).toHaveBeenCalledWith('communityname', 'Nsanje'));

    mockQueryChain.equalTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'source:vitals' }));

    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('Vitals'));
    expect(mockQueryChain.equalTo).not.toHaveBeenCalledWith('communityname', 'Nsanje');
  });
})
;

// The high/low completeness filter runs client-side over the fetched page. It
// must use the same per-source field list as the displayed score — otherwise a
// fully populated vitals record reads as "low" and is filtered out of its own
// source.
describe('completeness filter is scored per source', () => {
  it('keeps a fully populated vitals record under the high-completeness filter', async () => {
    mockFind.mockResolvedValue([fieldRecord('v1', FULL_VITALS)]);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByTestId('source-selector'));
    fireEvent.click(screen.getByRole('button', { name: 'source:vitals' }));
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('Vitals'));

    fireEvent.click(screen.getByRole('button', { name: 'filter to high completeness' }));
    await waitFor(() => expect(screen.getByTestId('records-table')).toHaveTextContent('1 rows'));
  });

  it('still hides a sparse survey-data record under the high-completeness filter', async () => {
    const sparse = makeRecord({ objectId: 'r1', dob: '', sex: '', householdId: '', telephoneNumber: '' });
    mockFind.mockResolvedValue([sparse]);
    render(<DataCurationManager />);
    await waitFor(() => screen.getByTestId('filter-bar'));
    fireEvent.click(screen.getByRole('button', { name: 'filter to high completeness' }));
    await waitFor(() => expect(screen.getByTestId('records-table')).toHaveTextContent('0 rows'));
  });
});

// Custom forms have their own metric (computeFormResultsCompleteness: 30%
// metadata + 70% answered-vs-expected). The summary bar and anomaly flags must
// use it too — scoring a FormResults record against the SurveyData field list
// rates it 13% and flags every row, contradicting the per-row percentages the
// table shows in the same view.
describe('form-results records are scored with the FormResults metric', () => {
  const { flagAnomalies } = require('app/epics/DataCurationManager');

  const formDefinition = {
    get: (k) => ({ fields: [{ formikKey: 'water_source' }, { formikKey: 'floor_material' }] }[k]),
  };

  function formResult(id, answers) {
    const data = {
      surveyingUser: 'alice',
      surveyingOrganization: 'TestOrg',
      client: { id: 'hh1' },
      fields: answers,
    };
    return { id, get: (k) => data[k], createdAt: new Date('2026-06-01T10:00:00Z') };
  }

  it('does not flag a fully answered form submission', () => {
    const rec = formResult('f1', [
      { title: 'water_source', answer: 'Well' },
      { title: 'floor_material', answer: 'Dirt' },
    ]);
    expect(flagAnomalies([rec], 'form-results:abc123', formDefinition).has('f1')).toBe(false);
  });

  it('flags a form submission with no answers', () => {
    const rec = formResult('f2', []);
    expect(flagAnomalies([rec], 'form-results:abc123', formDefinition).has('f2')).toBe(true);
  });
});
