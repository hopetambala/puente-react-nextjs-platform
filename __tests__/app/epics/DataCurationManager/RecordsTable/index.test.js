import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

// A minimal stand-in for i18next interpolation. Echoing the key alone would let
// `t('key') + pct + '%'` pass, which is the exact defect being guarded: values
// must be interpolated INTO a key, because word and number order differ by
// language and a sentence assembled from fragments cannot be translated.
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars
      ? `${k}(${Object.entries(vars).map(([n, v]) => `${n}=${v}`).join(',')})`
      : k),
  }),
}));


jest.mock('app/impacto-design-system', () => ({
  Badge: ({ children, variant }) => <span data-testid={`badge-${variant}`}>{children}</span>,
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Skeleton: ({ width, height }) => <span data-testid="skeleton" style={{ width, height }} />,
}));

const RecordsTable = require('app/epics/DataCurationManager/RecordsTable').default;

function makeRecord(overrides = {}) {
  const data = { fname: 'Hope', lname: 'Tambala', communityname: 'Nsanje', surveyingUser: 'alice', createdAt: new Date('2026-06-01') };
  return { id: 'r1', get: (k) => ({ ...data, ...overrides }[k]), createdAt: new Date('2026-06-01'), ...overrides };
}

const mockOnSelectRecord = jest.fn();
const mockOnPageChange = jest.fn();
const mockOnDuplicateGroup = jest.fn();

const defaultProps = {
  source: 'survey-data',
  records: [makeRecord()],
  total: 1,
  page: 0,
  dups: new Set(),
  anomalies: new Set(),
  onSelectRecord: mockOnSelectRecord,
  onPageChange: mockOnPageChange,
  onDuplicateGroup: mockOnDuplicateGroup,
  loading: false,
};

describe('RecordsTable — SurveyData columns', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Name column header', () => {
    render(<RecordsTable {...defaultProps} />);
    expect(screen.getByText('data_curation_col_name')).toBeInTheDocument();
  });

  it('renders Community, Surveyor, Submitted, Completeness, Flags headers', () => {
    render(<RecordsTable {...defaultProps} />);
    expect(screen.getByText('field_community')).toBeInTheDocument();
    expect(screen.getByText('field_surveyor')).toBeInTheDocument();
    expect(screen.getByText('field_submitted')).toBeInTheDocument();
    expect(screen.getByText('data_curation_col_completeness')).toBeInTheDocument();
    expect(screen.getByText('data_curation_col_flags')).toBeInTheDocument();
  });

  it('renders the record name in the row', () => {
    render(<RecordsTable {...defaultProps} />);
    expect(screen.getByText('Hope Tambala')).toBeInTheDocument();
  });

  it('calls onSelectRecord when a row is clicked', () => {
    render(<RecordsTable {...defaultProps} />);
    fireEvent.click(screen.getByText('Hope Tambala'));
    expect(mockOnSelectRecord).toHaveBeenCalledWith(defaultProps.records[0]);
  });
});

describe('RecordsTable — flag chips', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows Dup badge when record.id is in dups set', () => {
    render(<RecordsTable {...defaultProps} dups={new Set(['r1'])} />);
    expect(screen.getByText('data_curation_flag_dup')).toBeInTheDocument();
  });

  it('does not show Dup badge when record is not in dups set', () => {
    render(<RecordsTable {...defaultProps} dups={new Set()} />);
    expect(screen.queryByText('Dup')).not.toBeInTheDocument();
  });

  it('shows Low badge when record.id is in anomalies set', () => {
    render(<RecordsTable {...defaultProps} anomalies={new Set(['r1'])} />);
    expect(screen.getByText('data_curation_flag_low')).toBeInTheDocument();
  });
});

describe('RecordsTable — pagination', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows "Showing 1–1 of 1" when total=1 and page=0', () => {
    render(<RecordsTable {...defaultProps} />);
    expect(screen.getByText('pagination_showing(from=1,to=1,total=1)')).toBeInTheDocument();
  });

  it('calls onPageChange(1) when Next is clicked', () => {
    render(<RecordsTable {...defaultProps} total={100} />);
    fireEvent.click(screen.getByText('data_curation_next'));
    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange(0) when Prev is clicked on page 1', () => {
    render(<RecordsTable {...defaultProps} total={100} page={1} />);
    fireEvent.click(screen.getByText('data_curation_prev'));
    expect(mockOnPageChange).toHaveBeenCalledWith(0);
  });
});

describe('RecordsTable — FormResults columns', () => {
  it('renders Metadata % and Fields % headers for form-results source', () => {
    render(<RecordsTable {...defaultProps} source="form-results:abc" records={[makeRecord()]} />);
    expect(screen.getByText('data_curation_col_metadata_pct')).toBeInTheDocument();
    expect(screen.getByText('data_curation_col_fields_pct')).toBeInTheDocument();
  });
});

describe('RecordsTable — FormResults completeness', () => {
  beforeEach(() => jest.clearAllMocks());

  // Form definition with 2 expected fields
  const mockFormDef = {
    get: (k) => ({
      fields: [
        { formikKey: 'water_source', label: 'Water Source', fieldType: 'input' },
        { formikKey: 'floor_material', label: 'Floor Material', fieldType: 'input' },
      ],
    }[k]),
  };

  // Record with 1 of 2 fields answered, surveyingUser + surveyingOrganization present, no client, has createdAt
  function makeFormRecord() {
    const data = {
      surveyingUser: 'alice',
      surveyingOrganization: 'TestOrg',
      client: null,
      fields: [{ title: 'water_source', answer: 'Well' }],
    };
    return {
      id: 'fr1',
      get: (k) => data[k],
      createdAt: new Date('2026-06-01'),
    };
  }

  it('shows a percentage (not "—") in the Metadata % cell for FormResults rows', () => {
    render(
      <RecordsTable
        {...defaultProps}
        source="form-results:form1"
        records={[makeFormRecord()]}
        formDefinition={mockFormDef}
      />
    );
    // At least one percentage should appear; the hardcoded "—" cells should be gone
    const pctCells = screen.getAllByText(/data_curation_percent\(pct=\d+\)/);
    expect(pctCells.length).toBeGreaterThan(0);
    // The "—" placeholder that currently exists for completeness cells must not be present
    // (only the name cell or surveyor cell may legitimately show "—" for other fields)
    const dashCells = screen.queryAllByText('—');
    // All "—" in the completeness columns (Metadata % and Fields %) must be replaced by %
    // We verify that no cell with aria-label matching completeness shows "—"
    expect(screen.queryByRole('cell', { name: '—' })).not.toBeInTheDocument();
  });

  it('shows a percentage in the Fields % cell for FormResults rows', () => {
    render(
      <RecordsTable
        {...defaultProps}
        source="form-results:form1"
        records={[makeFormRecord()]}
        formDefinition={mockFormDef}
      />
    );
    // 1 of 2 fields answered → 50%
    expect(screen.getByText('data_curation_percent(pct=50)')).toBeInTheDocument();
  });
});

// ─── Extension classes ────────────────────────────────────────────────────────
//
// Vitals / EvaluationMedical / HistoryEnvironmentalHealth carry no communityname
// and none of the 8 SurveyData completeness fields. Community must be read
// through the included `client` pointer, and completeness scored against the
// fields the class actually has — otherwise every row read "—" and 13%.

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

function pointerRecord(id, own, clientData) {
  const client = clientData ? { get: (k) => clientData[k] } : undefined;
  const data = { surveyingUser: 'alice', ...own, client };
  return { id, get: (k) => data[k], createdAt: new Date('2026-06-01') };
}

describe('RecordsTable — community resolves through the client pointer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the community from the included client pointer for a vitals row', () => {
    const rec = pointerRecord('v1', FULL_VITALS, { fname: 'Juan', lname: 'Perez', communityname: 'Sabana Yegua' });
    render(<RecordsTable {...defaultProps} source="vitals" records={[rec]} />);
    expect(screen.getByText('Sabana Yegua')).toBeInTheDocument();
  });

  it('falls back to an em dash when the client pointer carries no community', () => {
    const rec = pointerRecord('v2', FULL_VITALS, { fname: 'Juan', lname: 'Perez' });
    render(<RecordsTable {...defaultProps} source="vitals" records={[rec]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('RecordsTable — completeness is scored per source', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scores a fully populated vitals row 100%', () => {
    const rec = pointerRecord('v1', FULL_VITALS, { fname: 'Juan', lname: 'Perez' });
    render(<RecordsTable {...defaultProps} source="vitals" records={[rec]} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });

  it('scores a vitals row with 4 of 6 readings 67%', () => {
    const partial = { bloodPressure: '120/80', pulse: '70', temp: '36.8', weight: '70' };
    const rec = pointerRecord('v2', partial, { fname: 'Juan', lname: 'Perez' });
    render(<RecordsTable {...defaultProps} source="vitals" records={[rec]} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '67');
  });

  it('scores a fully populated eval-medical row 100%', () => {
    const rec = pointerRecord('e1', FULL_EVAL_MEDICAL, { fname: 'Juan', lname: 'Perez' });
    render(<RecordsTable {...defaultProps} source="eval-medical" records={[rec]} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });

  it('scores a fully populated env-health row 100%', () => {
    const rec = pointerRecord('h1', FULL_ENV_HEALTH, { fname: 'Juan', lname: 'Perez' });
    render(<RecordsTable {...defaultProps} source="env-health" records={[rec]} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });

  it('still scores a survey-data row against the SurveyData fields', () => {
    render(<RecordsTable {...defaultProps} />);
    // makeRecord() populates 4 of the 8 scored fields: fname, lname, communityname, surveyingUser
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '50');
  });
});

// resolveParseClass() in ../index falls back to the SurveyData class for any
// source it doesn't recognise, so such rows really do carry fname/lname. The
// table must agree with that fallback rather than hunting for a client pointer.
describe('RecordsTable — unrecognised source follows the SurveyData fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads the person's own name when the source is unrecognised", () => {
    render(<RecordsTable {...defaultProps} source="not-a-known-source" />);
    expect(screen.getByText('Hope Tambala')).toBeInTheDocument();
  });

  it('reads the community off the record itself when the source is unrecognised', () => {
    render(<RecordsTable {...defaultProps} source="not-a-known-source" />);
    expect(screen.getByText('Nsanje')).toBeInTheDocument();
  });
});

// ─── Overhaul PR 5: design review C7, C18/X13, C21, X10 and the audit ────────
describe('RecordsTable — opening a record without a mouse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('makes the name a button, so Enter opens the record (WCAG 2.1.1)', () => {
    render(<RecordsTable {...defaultProps} />);
    const open = screen.getByRole('button', { name: 'Hope Tambala' });
    open.focus();
    fireEvent.click(open);
    expect(mockOnSelectRecord).toHaveBeenCalledTimes(1);
  });
});

describe('RecordsTable — completeness is a meter with its number shown', () => {
  it('exposes the score as a labelled meter and prints the percentage (WCAG 1.4.1, 4.1.2)', () => {
    render(<RecordsTable {...defaultProps} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    const pct = meter.getAttribute('aria-valuenow');
    expect(meter).toHaveAccessibleName('data_curation_col_completeness');
    expect(screen.getByText(`data_curation_percent(pct=${pct})`)).toBeInTheDocument();
  });
});

describe('RecordsTable — empty and loading states', () => {
  const empty = { ...defaultProps, records: [], total: 0 };

  it('says where records come from when there are none yet, without "Showing 0–0 of 0"', () => {
    render(<RecordsTable {...empty} hasFilters={false} />);
    expect(screen.getByText('data_curation_no_records')).toBeInTheDocument();
    expect(screen.queryByText(/pagination_showing/)).not.toBeInTheDocument();
  });

  it('says no records match the filters, with a way to clear them', () => {
    const onClearFilters = jest.fn();
    render(<RecordsTable {...empty} hasFilters onClearFilters={onClearFilters} />);
    expect(screen.getByText('data_curation_no_results')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'data_curation_clear_filters' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('does not claim "Showing 0–0 of 0" while it is still loading, and says it is busy', () => {
    render(<RecordsTable {...defaultProps} records={[]} total={0} loading />);
    expect(screen.queryByText(/pagination_showing/)).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('RecordsTable — pagination labels (design review X10)', () => {
  it('uses words, not arrow characters, which screen readers read aloud', () => {
    const eng = require('../../../../../public/locales/eng/common.json');
    expect(eng.data_curation_prev).not.toMatch(/[←→‹›]/);
    expect(eng.data_curation_next).not.toMatch(/[←→‹›]/);
  });
});
