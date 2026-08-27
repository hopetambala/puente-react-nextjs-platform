import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { SURVEY_COMPLETENESS_FIELDS } from 'app/modules/data-quality';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      data_curation_records: 'records',
      data_curation_avg: 'avg completeness',
      data_curation_dups: 'duplicates',
      data_curation_anomalies: 'anomalies',
    }[key] ?? key),
  }),
}));

// The active signal arrives as a query param on the deep link the dashboard's
// needs-attention queue emits: /data/data-curation?signal=unresolved-parent
let mockRouterQuery = {};
jest.mock('next/router', () => ({
  useRouter: () => ({ query: mockRouterQuery, push: jest.fn(), pathname: '/data/data-curation' }),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => ({
    get: (key) => ({ organization: 'TestOrg' }[key] ?? null),
  })),
}));

// Per-instance Parse.Query recorder (same idiom as
// __tests__/app/epics/DashboardTriage/loadTriage.test.js) so a test can name
// WHICH query it is asserting about. The component fires three: a facet
// sample, a form-definition lookup, and the main paginated fetch.
//
// No distinct(): the browser SDK has no Master Key, so Parse.distinct() does
// not exist client-side and mocking it would bake in a false capability.
const mockInstances = [];
function mockRecord(inst, name, ...args) {
  inst._constraints.push([name, ...args]);
  return inst;
}
jest.mock('parse', () => {
  const Query = function Query(cls) {
    const inst = {
      cls,
      _constraints: [],
      _limit: null,
      _skipped: false,
      equalTo: jest.fn(function eq(...a) { return mockRecord(this, 'equalTo', ...a); }),
      notEqualTo: jest.fn(function ne(...a) { return mockRecord(this, 'notEqualTo', ...a); }),
      exists: jest.fn(function ex(...a) { return mockRecord(this, 'exists', ...a); }),
      doesNotExist: jest.fn(function dne(...a) { return mockRecord(this, 'doesNotExist', ...a); }),
      greaterThanOrEqualTo: jest.fn(function gte(...a) { return mockRecord(this, 'greaterThanOrEqualTo', ...a); }),
      lessThanOrEqualTo: jest.fn(function lte(...a) { return mockRecord(this, 'lessThanOrEqualTo', ...a); }),
      descending: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn(function lim(n) { this._limit = n; return this; }),
      skip: jest.fn(function sk() { this._skipped = true; return this; }),
      find: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
    };
    mockInstances.push(inst);
    return inst;
  };
  Query.or = jest.fn((...qs) => {
    const inst = {
      cls: 'or',
      _or: qs,
      _constraints: [],
      _limit: null,
      _skipped: false,
      equalTo: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn(function lim(n) { this._limit = n; return this; }),
      skip: jest.fn(function sk() { this._skipped = true; return this; }),
      find: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
    };
    mockInstances.push(inst);
    return inst;
  });
  return { Parse: { Query, Object: { extend: jest.fn(() => ({})) } } };
});

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

jest.mock('app/epics/DataCurationManager/SourceSelector', () => () => <div data-testid="source-selector" />);
jest.mock('app/epics/DataCurationManager/FilterBar', () => () => <div data-testid="filter-bar" />);
jest.mock('app/epics/DataCurationManager/RecordsTable', () => ({ records }) => (
  <div data-testid="records-table">{records.length} rows</div>
));
jest.mock('app/epics/DataCurationManager/RecordInspector', () => () => <div data-testid="record-inspector" />);
jest.mock('app/epics/DataCurationManager/DuplicateResolver', () => () => <div data-testid="duplicate-resolver" />);
jest.mock('app/epics/DataCurationManager/CommunityAudit', () => () => <div data-testid="community-audit" />);

const DataCurationManager = require('app/epics/DataCurationManager').default;

// The main paginated fetch is the only query that paginates — the facet sample
// just caps at 1000 and never skips. Matched on skip() alone, not on the class
// name, because a signal-scoped queue paginates an OR tree rather than a bare
// SurveyData query, and both are the same fetch from the user's side.
const pagedQuery = () => mockInstances.find((q) => q._skipped);

// Every constraint the paged query can match on, flattened across the OR tree —
// same pair as __tests__/app/modules/data-quality/index.test.js, because an OR
// predicate hangs its constraints off sub-queries instead of the top level.
const flattenConstraints = (q) => (q.cls === 'or'
  ? q._or.reduce((acc, sub) => acc.concat(flattenConstraints(sub)), [])
  : q._constraints.slice());

const asked = (constraints, tuple) => constraints
  .some((c) => c.length === tuple.length && c.every((part, i) => part === tuple[i]));

beforeEach(() => {
  jest.clearAllMocks();
  mockInstances.length = 0;
  mockRouterQuery = {};
});

describe('signal deep link', () => {
  it('constrains the paginated records query to unresolved-parent records when ?signal=unresolved-parent', async () => {
    mockRouterQuery = { signal: 'unresolved-parent' };

    render(<DataCurationManager />);
    await waitFor(() => expect(pagedQuery()).toBeDefined());

    // An orphan is a record whose offline household link was minted on the
    // device but never resolved server-side. That predicate already has one
    // home: unresolvedParentQuery() in app/modules/data-quality — the
    // dashboard counts with it, so this screen must filter with it, or the
    // "2 records" the user clicked and the rows they land on disagree.
    // Asserted on the QUERY, not on the fetched page: a client-side filter
    // over 50 fetched rows cannot honour a class-scoped count.
    expect(pagedQuery()._constraints).toEqual(expect.arrayContaining([
      ['exists', 'householdObjectIdOffline'],
      ['doesNotExist', 'householdId'],
    ]));
  });

  it('constrains the paginated records query to records missing a key field when ?signal=missing-key-fields', async () => {
    mockRouterQuery = { signal: 'missing-key-fields' };

    render(<DataCurationManager />);
    await waitFor(() => expect(pagedQuery()).toBeDefined());

    const constraints = flattenConstraints(pagedQuery());

    // "Missing a key field" has one definition — SURVEY_COMPLETENESS_FIELDS and
    // missingKeyFieldsQuery() in app/modules/data-quality — and the dashboard
    // counts the queue with it. Driving the expectation off the exported field
    // list is the point: if this screen carries its own list, the count the user
    // clicked and the rows they land on drift apart silently.
    //
    // Both arms per field, since Parse's doesNotExist does not match '' while
    // the app's own completeness scoring counts '' as unfilled — a record with
    // telephoneNumber: '' belongs in this queue. Asserted on the QUERY, not on
    // the fetched page: a client-side filter over 50 rows cannot honour a
    // class-scoped count().
    expect(SURVEY_COMPLETENESS_FIELDS.map((field) => ({
      field,
      matchesAbsent: asked(constraints, ['doesNotExist', field]),
      matchesEmptyString: asked(constraints, ['equalTo', field, '']),
    }))).toEqual(SURVEY_COMPLETENESS_FIELDS.map((field) => ({
      field,
      matchesAbsent: true,
      matchesEmptyString: true,
    })));
  });

  it('renders the ordinary unfiltered records view when ?signal= is an unrecognised value', async () => {
    // A URL is user-supplied: stale bookmarks, typos, hand-edited links. An
    // unrecognised signal must degrade to the plain org-scoped list, not break
    // the screen. `constructor` is the value that proves it, because it is
    // inherited from Object.prototype — a naive lookup on a plain object
    // literal hands back a truthy non-predicate for it (as it would for
    // toString, valueOf, hasOwnProperty), where a typo like `nonsense` would
    // simply miss and pass.
    mockRouterQuery = { signal: 'constructor' };

    expect(() => render(<DataCurationManager />)).not.toThrow();
    await waitFor(() => expect(pagedQuery()).toBeDefined());

    const constraints = flattenConstraints(pagedQuery());

    // The ordinary fetch: scoped to the user's org and carrying none of the
    // signal predicates' arms. Asserted as one object so a partial degradation
    // (org scope dropped, or a signal arm left on) reads off the diff.
    expect({
      scopedToOrg: asked(constraints, ['equalTo', 'surveyingOrganization', 'TestOrg']),
      carriesUnresolvedParentArm: asked(constraints, ['exists', 'householdObjectIdOffline']),
      carriesMissingKeyFieldArm: SURVEY_COMPLETENESS_FIELDS
        .some((field) => asked(constraints, ['doesNotExist', field])),
    }).toEqual({
      scopedToOrg: true,
      carriesUnresolvedParentArm: false,
      carriesMissingKeyFieldArm: false,
    });
  });
});
