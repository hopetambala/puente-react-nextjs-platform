import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// `t` echoes the key, and appends its interpolation vars when given any. That
// second half matters here: the rename confirmation embeds a community name,
// and a template literal that concatenates the name into an English sentence
// cannot be translated — word order differs by language.
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars ? `${k} ${JSON.stringify(vars)}` : k),
  }),
}));

jest.mock('app/impacto-design-system', () => ({
  Panel: ({ title, children }) => <div><h3>{title}</h3>{children}</div>,
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
  Modal: ({ open, text, action, actionText }) => (open ? (
    <div role="dialog">
      <p>{text}</p>
      <button type="button" onClick={action}>{actionText}</button>
    </div>
  ) : null),
}));

const mockFind = jest.fn().mockResolvedValue([]);
const mockSave = jest.fn().mockResolvedValue({});

// Helper: build mock records whose communityname comes from the given list
function recordsFromNames(names) {
  return names.map((n) => ({ get: (k) => (k === 'communityname' ? n : undefined), set: jest.fn(), save: mockSave }));
}

jest.mock('app/modules/organization', () => ({
  ...jest.requireActual('app/modules/organization'),
  loadOrganizationScope: (Parse, org) => Promise.resolve([org]),
}));

jest.mock('parse', () => ({
  Parse: {
    Query: jest.fn(() => ({
      equalTo: jest.fn().mockReturnThis(),
  containedIn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      find: mockFind,
    })),
    Object: { extend: jest.fn(() => ({})) },
  },
}));

jest.mock('app/services/parse', () => ({ initialize: jest.fn() }));

const { levenshtein } = require('app/epics/DataCurationManager/CommunityAudit');
const CommunityAudit = require('app/epics/DataCurationManager/CommunityAudit').default;
const { Parse: MockParse } = require('parse');

describe('levenshtein (pure function)', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('Sabana Yegua', 'Sabana Yegua')).toBe(0);
  });

  it('returns ≤ 2 for "Sabana Yegua" vs "Sabana Yégua"', () => {
    expect(levenshtein('Sabana Yegua', 'Sabana Yégua')).toBeLessThanOrEqual(2);
  });

  it('returns > 2 for clearly different names', () => {
    expect(levenshtein('Nsanje', 'Blantyre')).toBeGreaterThan(2);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('CommunityAudit — grouping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Community Audit panel', async () => {
    mockFind.mockResolvedValue([]);
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => expect(screen.getByText('data_curation_audit_title')).toBeInTheDocument());
  });

  it('routes the empty state through t()', async () => {
    mockFind.mockResolvedValue([]);
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => expect(screen.getByText('data_curation_audit_empty')).toBeInTheDocument());
  });

  it('routes the Apply button label through t()', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => expect(screen.getByText('data_curation_audit_apply')).toBeInTheDocument());
  });

  it('interpolates the community name into the confirmation rather than concatenating it', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => screen.getByText('data_curation_audit_apply'));
    fireEvent.click(screen.getByText('data_curation_audit_apply'));
    expect(
      screen.getByText(/^data_curation_audit_rename_confirm .*"target":"Sabana Yegua"/),
    ).toBeInTheDocument();
  });

  it('shows grouped misspellings when similar names exist', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua', 'Nsanje']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => {
      expect(screen.getByText('Sabana Yegua')).toBeInTheDocument();
      expect(screen.getByText('Sabana Yégua')).toBeInTheDocument();
    });
  });

  it('does not group names with distance > 2', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Nsanje', 'Blantyre']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => screen.getByText('data_curation_audit_title'));
    // Neither should be shown as a duplicate group
    expect(screen.queryByText(/apply/i)).not.toBeInTheDocument();
  });
});

describe('CommunityAudit — apply canonical name', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders an Apply button when a group exists', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => expect(screen.getByText(/apply/i)).toBeInTheDocument());
  });

  it('opens a confirm dialog on Apply and does NOT save until confirmed', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => screen.getByText(/apply/i));
    fireEvent.click(screen.getByText(/apply/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves renamed records after confirming', async () => {
    // First find() loads the distinct names; subsequent find() calls return the
    // variant records to be renamed.
    mockFind
      .mockResolvedValueOnce(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']))
      .mockResolvedValue(recordsFromNames(['Sabana Yégua']));
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => screen.getByText(/apply/i));
    fireEvent.click(screen.getByText(/apply/i));
    fireEvent.click(screen.getByText('data_curation_audit_rename_action'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
  });
});

describe('CommunityAudit — the rename must finish what the dialog promises', () => {
  // Overriding Parse.Query is global to the module mock, so the original is
  // captured and restored - otherwise the suites after this one see a Query
  // rebuilt for a different assertion.
  const defaultQuery = MockParse.Query.getMockImplementation();
  afterEach(() => { MockParse.Query.mockImplementation(defaultQuery); });
  beforeEach(() => jest.clearAllMocks());

  // The dialog says "This updates every matching record and cannot be undone."
  // The read path sets limit(1000); the rename path set NO limit, so Parse
  // applied its server default of 100. For a community like La Islita - 10,439
  // records across six spellings - that renamed 100 and silently left the rest,
  // irreversibly, behind a success message.
  //
  // Note what is NOT asserted here: "1007 records got saved". The Parse mock
  // returns whatever it is handed, so it cannot reproduce a server-side cap -
  // such a test passes against the bug and proves nothing. These assert the
  // mechanism that makes the cap impossible instead.

  function openRenameWith(findImpl) {
    mockFind.mockImplementation(findImpl);
    render(<CommunityAudit orgValues={['TestOrg']} />);
  }

  it('sets an explicit limit rather than inheriting Parse\'s server default', async () => {
    // Relying on the default is what made the cap invisible: nothing at the
    // call site said "100".
    const limitSpy = jest.fn().mockReturnThis();
    MockParse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: limitSpy,
      find: mockFind,
    }));
    mockFind
      .mockResolvedValueOnce(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']))
      .mockResolvedValue(recordsFromNames(['Sabana Yégua']));

    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => screen.getByText(/apply/i));
    limitSpy.mockClear();
    fireEvent.click(screen.getByText(/apply/i));
    fireEvent.click(screen.getByText('data_curation_audit_rename_action'));

    await waitFor(() => expect(limitSpy).toHaveBeenCalled());
  });

  it('re-queries the SAME class while a full page comes back', async () => {
    // Renamed records drop out of the filter, so the honest shape is to
    // re-query until nothing matches - not one query and hope.
    //
    // Counted PER CLASS on purpose: the rename loops four audit classes, so a
    // bare "find was called more than once" passes without any paging at all.
    const PAGE = 1000;
    let call = 0;
    mockFind.mockImplementation(() => {
      call += 1;
      if (call <= 4) return Promise.resolve(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
      if (call === 5) return Promise.resolve(recordsFromNames(Array(PAGE).fill('Sabana Yégua')));
      return Promise.resolve([]);
    });
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => screen.getByText(/apply/i));

    MockParse.Query.mockClear();
    fireEvent.click(screen.getByText(/apply/i));
    fireEvent.click(screen.getByText('data_curation_audit_rename_action'));

    await waitFor(() => {
      const surveyDataQueries = MockParse.Query.mock.calls.filter((c) => c[0] === 'SurveyData').length;
      expect(surveyDataQueries).toBeGreaterThan(1);
    });
  });
});

// The audit samples community names per Parse class. A class name that is not in
// schema/schema.json returns zero rows instead of erroring, so its communities
// silently vanish from the audit — and from the rename that follows.
describe('CommunityAudit — audited Parse classes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFind.mockResolvedValue([]);
  });

  it('samples HistoryEnvironmentalHealth', async () => {
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('HistoryEnvironmentalHealth'));
  });

  it('never samples the non-existent EnvironmentalHealth class', async () => {
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => expect(MockParse.Query).toHaveBeenCalledWith('HistoryEnvironmentalHealth'));
    expect(MockParse.Query).not.toHaveBeenCalledWith('EnvironmentalHealth');
  });

  it('samples SurveyData, EvaluationMedical and Vitals', async () => {
    render(<CommunityAudit orgValues={['TestOrg']} />);
    await waitFor(() => {
      expect(MockParse.Query).toHaveBeenCalledWith('SurveyData');
      expect(MockParse.Query).toHaveBeenCalledWith('EvaluationMedical');
      expect(MockParse.Query).toHaveBeenCalledWith('Vitals');
    });
  });
});
