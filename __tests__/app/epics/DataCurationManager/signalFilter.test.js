import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SURVEY_COMPLETENESS_FIELDS } from 'app/modules/data-quality';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// t() resolves against the REAL eng locale and renders MISSING:<key> for a key
// that does not ship, so an assertion on visible copy also proves the string is
// translatable. Six locales ship, one of them right-to-left, so an English
// literal baked into the component would read as English everywhere. Same idiom
// as __tests__/pages/quick-start/index.test.js.
// eslint-disable-next-line global-require
const engCommon = require('public/locales/eng/common.json');

const mockTranslate = (key, opts) => {
  if (!(key in engCommon)) return `MISSING:${key}`;
  let out = engCommon[key];
  if (opts) {
    Object.entries(opts).forEach(([k, v]) => {
      out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    });
  }
  return out;
};

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));

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
jest.mock('app/modules/organization', () => ({
  ...jest.requireActual('app/modules/organization'),
  loadOrganizationScope: (Parse, org) => Promise.resolve([org]),
}));

jest.mock('parse', () => {
  const Query = function Query(cls) {
    const inst = {
      cls,
      _constraints: [],
      _limit: null,
      _skipped: false,
      equalTo: jest.fn(function eq(...a) { return mockRecord(this, 'equalTo', ...a); }),
      containedIn: jest.fn(function ci(...a) { return mockRecord(this, 'containedIn', ...a); }),
      notEqualTo: jest.fn(function ne(...a) { return mockRecord(this, 'notEqualTo', ...a); }),
      exists: jest.fn(function ex(...a) { return mockRecord(this, 'exists', ...a); }),
      doesNotExist: jest.fn(function dne(...a) { return mockRecord(this, 'doesNotExist', ...a); }),
      greaterThanOrEqualTo: jest.fn(function gte(...a) { return mockRecord(this, 'greaterThanOrEqualTo', ...a); }),
      lessThanOrEqualTo: jest.fn(function lte(...a) { return mockRecord(this, 'lessThanOrEqualTo', ...a); }),
      include: jest.fn(function inc(...a) { return mockRecord(this, 'include', ...a); }),
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
      containedIn: jest.fn().mockReturnThis(),
      include: jest.fn().mockReturnThis(),
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

// The REAL SourceSelector renders here, so a test can change the data source
// the way a user does — by picking an option off the control by the label it
// shows. Only react-select is stubbed, down to a native <select> carrying the
// selector's own option list, verbatim from
// __tests__/app/epics/DataCurationManager/SourceSelector/index.test.js.
jest.mock('react-select', () => ({
  options, value, onChange, inputId, placeholder,
}) => (
  <select
    data-testid="source-select"
    id={inputId}
    value={value?.value ?? ''}
    onChange={(e) => {
      const flat = options.flatMap((g) => g.options ?? [g]);
      onChange(flat.find((o) => o.value === e.target.value));
    }}
  >
    <option value="" disabled>{placeholder}</option>
    {options.map((group) => (group.options
      ? group.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
      : <option key={group.value} value={group.value}>{group.label}</option>))}
  </select>
));
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

// Which Parse class(es) a query actually reads from, flattened across the OR
// tree for the same reason flattenConstraints is: a signal-scoped queue is an OR
// of sub-queries, and it is the sub-queries that name the class.
const classesQueried = (q) => [...new Set(q.cls === 'or'
  ? q._or.reduce((acc, sub) => acc.concat(classesQueried(sub)), [])
  : [q.cls])];

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
      scopedToOrg: constraints.some((c) => c[0] === 'containedIn'
        && c[1] === 'surveyingOrganization'
        && Array.isArray(c[2]) && c[2].includes('TestOrg')),
      carriesUnresolvedParentArm: asked(constraints, ['exists', 'householdObjectIdOffline']),
      carriesMissingKeyFieldArm: SURVEY_COMPLETENESS_FIELDS
        .some((field) => asked(constraints, ['doesNotExist', field])),
    }).toEqual({
      scopedToOrg: true,
      carriesUnresolvedParentArm: false,
      carriesMissingKeyFieldArm: false,
    });
  });

  it('tells the reader in words that the view is narrowed to records missing key fields', async () => {
    mockRouterQuery = { signal: 'missing-key-fields' };

    render(<DataCurationManager />);
    // Skeletons clear once find()/count() settle, so the loaded surface — not the
    // loading placeholder — is what gets read.
    await waitFor(() => expect(screen.queryAllByTestId('skeleton')).toHaveLength(0));

    const surface = document.body.textContent;

    // A steward arrives here from the dashboard queue having just read "12
    // records missing key fields", and lands on a table showing a different
    // number with every filter control still reading "All". A view that is
    // filtered must not present itself as unfiltered: it has to say, in prose a
    // person reads, both THAT it is narrowed and WHICH narrowing is applied.
    //
    // Read off document.body rather than a test id, because a disclosure only a
    // test can find is not a disclosure. Three facts, asserted as one object so
    // a half-fix (a bare slug echo, or an untranslated literal) reads off the
    // diff instead of hiding behind a passing assertion:
    //
    //  - names the filter in prose: the spaced human phrase, which the raw slug
    //    "missing-key-fields" cannot satisfy;
    //  - marks it as a restriction, not a decoration, so the number below it is
    //    understood as a subset;
    //  - carries no MISSING: marker, i.e. every string it renders ships as a
    //    real key in public/locales/eng/common.json rather than an English
    //    literal that would stay English in the other five locales.
    expect({
      namesTheFilterInProse: /missing key fields/i.test(surface),
      marksTheViewAsRestricted: /\bonly\b|\bfilter/i.test(surface),
      everyStringShipsAsALocaleKey: !/MISSING:/.test(surface),
    }).toEqual({
      namesTheFilterInProse: true,
      marksTheViewAsRestricted: true,
      everyStringShipsAsALocaleKey: true,
    });
  });
});

describe('signal deep link, after the source is changed', () => {
  it('queries the newly selected source class rather than SurveyData while ?signal= is still in the URL', async () => {
    // The user arrives on a needs-attention deep link, then asks for a
    // different class from the source selector. The signal lives in the URL and
    // the source lives in component state, so the signal outlives the source
    // change — but every signal predicate in app/modules/data-quality is
    // SurveyData-only (the key fields and the offline household link exist
    // nowhere else). A user who asks for Vitals and is handed SurveyData rows
    // has no way to tell: the rows render, the table fills, nothing errors.
    mockRouterQuery = { signal: 'missing-key-fields' };

    render(<DataCurationManager />);
    await waitFor(() => expect(pagedQuery()).toBeDefined());

    // Only the fetch that follows the source change is under test — the arrival
    // fetch has its own coverage above — so the recorder starts clean here and
    // pagedQuery() can only be the post-change paginated fetch.
    mockInstances.length = 0;

    // Driven off the label the selector actually shows, through the real
    // SourceSelector, so this asserts the path a user takes rather than poking
    // the orchestrator's setSource.
    const vitals = await screen.findByRole('option', { name: 'Vitals' });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: vitals.value } });

    await waitFor(() => expect(pagedQuery()).toBeDefined());

    // Asserted on the class the paginated fetch is built against — flattened
    // across the OR tree, because a signal-scoped queue names its class on the
    // sub-queries. Whatever narrowing survives the source change, the rows have
    // to come from the class the user picked.
    expect(classesQueried(pagedQuery())).toEqual(['Vitals']);
  });
});
