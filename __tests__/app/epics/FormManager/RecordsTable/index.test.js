import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { axe } from '../../../../../__test-utils__/axe';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars
      ? `${k}(${Object.entries(vars).map(([n, v]) => `${n}=${v}`).join(',')})`
      : k),
  }),
}));

jest.mock('app/impacto-design-system', () => ({
  Badge: ({ children, variant }) => (
    <span data-testid={`badge-${variant}`}>{children}</span>
  ),
  EmptyState: ({ message }) => <p data-testid="empty-state">{message}</p>,
  Spinner: () => <div data-testid="spinner" />,
}));

const mockScope = jest.fn();
jest.mock('app/modules/organization', () => ({
  loadOrganizationScope: (...args) => mockScope(...args),
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
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
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
  mockScope.mockResolvedValue(['WOF', 'HOF']);
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
    <RecordsTable form={defaultForm} organization="WOF" {...props} />,
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────

describe('RecordsTable — loading', () => {
  it('shows a spinner while fetching', () => {
    Parse.Query._mockFind.mockReturnValue(new Promise(() => {})); // never resolves
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
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
    // One record: with none, the empty state stands in for the table.
    Parse.Query._mockFind.mockResolvedValue([makeRecord()]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find: Parse.Query._mockFind,
    }));
  });

  it('renders Record ID column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('form_manager_col_record')).toBeInTheDocument());
  });

  it('renders Surveyor column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('field_surveyor')).toBeInTheDocument());
  });

  it('renders Submitted column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('field_submitted')).toBeInTheDocument());
  });

  it('renders Status column header', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('field_status')).toBeInTheDocument());
  });

  // "Household" and "Water source" came from the environmental-health design
  // mock. No other form has those fields, so on Vitals and every custom form
  // they were a column of dashes on every row (2026-11-07).
  it('has no Household or Water source column', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('field_status')).toBeInTheDocument());
    expect(screen.queryByText('field_household')).not.toBeInTheDocument();
    expect(screen.queryByText('form_manager_col_water_source')).not.toBeInTheDocument();
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
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
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
    expect(screen.getByTestId('badge-green')).toHaveTextContent('sync_ribbon_synced');
  });

  it('renders an orange Conflict badge for conflict records', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('badge-orange')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('badge-orange')).toHaveTextContent('form_manager_status_conflict');
  });

  it('shows no household or water source, even on a record that has them', async () => {
    renderTable();
    await waitFor(() => expect(screen.getByText('EH-218')).toBeInTheDocument());
    expect(screen.queryByText('Sabana Yegua · Block 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Bottled')).not.toBeInTheDocument();
  });
});

// ─── Parse query wiring ────────────────────────────────────────────────────────

describe('RecordsTable — Parse query', () => {
  let equalToMock;
  let containedInMock;
  beforeEach(() => {
    Parse.Query._mockFind.mockResolvedValue([]);
    equalToMock = jest.fn().mockReturnThis();
    containedInMock = jest.fn().mockReturnThis();
    Parse.Query.mockImplementation(() => ({
      equalTo: equalToMock,
      containedIn: containedInMock,
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find: Parse.Query._mockFind,
    }));
  });

  // Custom-form answers live in FormResults, keyed by formSpecificationsId.
  // Asking SurveyData for `formSpecification` showed 0 of CMM's 561 results.
  it('reads a custom form from FormResults, scoped to every name of the organization', async () => {
    renderTable();
    await waitFor(() => {
      expect(Parse.Query).toHaveBeenCalledWith('FormResults');
      expect(equalToMock).toHaveBeenCalledWith('formSpecificationsId', 'form-abc');
      expect(containedInMock).toHaveBeenCalledWith('surveyingOrganization', ['WOF', 'HOF']);
    });
    expect(mockScope).toHaveBeenCalledWith(expect.anything(), 'WOF');
  });

  // Clicking "Vitals" used to list 44,038 patients from every organization.
  it('reads the Vitals card from the Vitals class, never from SurveyData', async () => {
    renderTable({ form: { name: 'Vitals', description: '' } });
    await waitFor(() => expect(Parse.Query).toHaveBeenCalledWith('Vitals'));
    expect(Parse.Query).not.toHaveBeenCalledWith('SurveyData');
    expect(containedInMock).toHaveBeenCalledWith('surveyingOrganization', ['WOF', 'HOF']);
  });

  it('queries nothing, and says so, when the organization has no scope', async () => {
    mockScope.mockResolvedValue([]);
    renderTable();
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(Parse.Query).not.toHaveBeenCalled();
  });
});

// ─── Empty state ───────────────────────────────────────────────────────────────

describe('RecordsTable — empty state', () => {
  it('shows an empty state when there are no records', async () => {
    Parse.Query._mockFind.mockResolvedValue([]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
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
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
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
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(100),
      find: Parse.Query._mockFind,
    }));
  });

  it('shows a "Showing X–Y of Z" summary', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByText(/^pagination_showing\(from=1,/)).toBeInTheDocument(),
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

describe('FormManager RecordsTable — copy', () => {
  const records = [
    makeRecord({ id: 'EH-218', household: 'Sabana Yegua · Block 4', syncStatus: 'synced', waterSource: 'Bottled' }),
  ];

  function mockQuery(rows, total) {
    Parse.Query._mockFind.mockResolvedValue(rows);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(total),
      find: Parse.Query._mockFind,
    }));
  }

  it('routes the empty state through t()', async () => {
    mockQuery([], 0);
    renderTable();
    await waitFor(() => expect(screen.getByTestId('empty-state')).toHaveTextContent('form_manager_records_empty'));
  });

  it("routes the synced badge through the ribbon's existing key", async () => {
    mockQuery(records, 1);
    renderTable();
    await waitFor(() => expect(screen.getAllByText('sync_ribbon_synced').length).toBeGreaterThan(0));
  });

  // A checkbox per row that no action used, and a "⋯" that opened nothing.
  it('has no selection checkboxes and no dead menu', async () => {
    mockQuery(records, 1);
    renderTable();
    await screen.findByText('EH-218');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('⋯')).not.toBeInTheDocument();
  });

  it('interpolates all three pagination numbers rather than concatenating them', async () => {
    mockQuery(records, 1);
    renderTable();
    await waitFor(() => {
      expect(screen.getByText('pagination_showing(from=1,to=1,total=1)')).toBeInTheDocument();
    });
  });

  // Design review X10 (WCAG 2.5.3): "‹ Prev" was named "Previous page", so a
  // voice-control user saying what they saw matched nothing.
  it('names the page controls by their visible words', async () => {
    mockQuery(records, 1);
    renderTable();
    const prev = await screen.findByRole('button', { name: 'form_manager_prev' });
    const next = screen.getByRole('button', { name: 'form_manager_next' });
    expect(prev).not.toHaveAttribute('aria-label');
    expect(next).not.toHaveAttribute('aria-label');
  });
});

// Puente cards (Vitals, SurveyData, …) have no objectId: they are classes, not
// form specifications. Requiring one logged a PropTypes error on every click.
describe('RecordsTable — Puente card props', () => {
  it('accepts a Puente card without an objectId', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    Parse.Query._mockFind.mockResolvedValue([]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find: Parse.Query._mockFind,
    }));
    renderTable({ form: { name: 'Vitals', description: '' } });
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    // React 17 logs a format string with "prop" as a separate argument:
    // ("Warning: Failed %s type: %s%s", "prop", …).
    const propTypeErrors = consoleError.mock.calls.filter((c) => String(c[0]).includes('Failed %s type') && c[1] === 'prop');
    consoleError.mockRestore();
    expect(propTypeErrors).toEqual([]);
  });
});

// A failed load is not an empty form. Saying "No records found" when the
// request failed is the "nothing appeared" a coordinator reported, and on a
// field connection the organization lookup this view now makes can fail too.
describe('RecordsTable — failed load', () => {
  function mockFailingThenWorking() {
    const find = jest.fn()
      .mockRejectedValueOnce(new Error('XMLHttpRequest failed'))
      .mockResolvedValue([]);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      find,
    }));
    return find;
  }

  it('says the records did not load, not that there are none', async () => {
    mockFailingThenWorking();
    renderTable();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('form_manager_records_error'));
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('says so when the organization lookup fails', async () => {
    mockFailingThenWorking();
    mockScope.mockRejectedValueOnce(new Error('offline'));
    renderTable();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('form_manager_records_error'));
  });

  it('loads again from "Try again"', async () => {
    const find = mockFailingThenWorking();
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: 'form_manager_retry' }));
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(find).toHaveBeenCalledTimes(2);
  });
});

// It was a grid of divs: no table, no headers a screen reader could tie to a
// value, and no name for which form's records these are.
describe('RecordsTable — a real table', () => {
  function mockQuery(rows, total, find = Parse.Query._mockFind) {
    find.mockResolvedValue(rows);
    Parse.Query.mockImplementation(() => ({
      equalTo: jest.fn().mockReturnThis(),
      containedIn: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(total),
      find,
    }));
  }

  it("is a table named for the form's records, with column headers", async () => {
    mockQuery([makeRecord({ id: 'EH-218' })], 1);
    renderTable();
    const table = await screen.findByRole('table', { name: 'form_manager_records_caption(name=Environmental Health)' });
    expect(table).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent))
      .toEqual(['form_manager_col_record', 'field_surveyor', 'field_submitted', 'field_status']);
    expect(screen.getAllByRole('cell')[0]).toHaveAttribute('data-label', 'form_manager_col_record');
  });

  it('names a Puente form by its translated name', async () => {
    mockQuery([], 0);
    renderTable({ form: { name: 'Vitals', labelKey: 'data_curation_source_vitals' } });
    await screen.findByTestId('empty-state');
    expect(screen.getByRole('heading', { name: 'data_curation_source_vitals' })).toBeInTheDocument();
  });

  // Swapping the table for a spinner unmounted Next while it had focus, so
  // focus fell to <body> on every page turn.
  it('keeps the table and focus in place while the next page loads', async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => makeRecord({ id: `EH-${100 + i}` }));
    mockQuery(twenty, 100);
    renderTable();
    const next = await screen.findByRole('button', { name: 'form_manager_next' });
    next.focus();
    Parse.Query._mockFind.mockReturnValue(new Promise(() => {}));
    fireEvent.click(next);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    expect(next).toHaveFocus();
  });

  it('has no axe violations', async () => {
    mockQuery([makeRecord({ id: 'EH-218' })], 1);
    const { container } = renderTable();
    await screen.findByText('EH-218');
    expect(await axe(container)).toHaveNoViolations();
  });
});
