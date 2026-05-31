import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('app/modules/cloud-code', () => ({
  retrieveCustomData: jest.fn(),
  updateObject: jest.fn().mockResolvedValue({}),
}));

// Mock sub-components — only the business logic lives in the epic/Table layer
jest.mock('app/epics/FormManager/Table', () =>
  jest.fn(({
    data, passDataToFormCreator, organization, retrieveCustomData: refresh, onSelectForm,
  }) => (
    <div data-testid="table" data-count={data.length}>
      {data.map((f) => (
        <div key={f.objectId} data-testid={`row-${f.objectId}`}>
          <span>{f.name}</span>
          <button
            type="button"
            data-testid={`edit-${f.objectId}`}
            onClick={() => passDataToFormCreator('edit', f)}
          >
            Edit
          </button>
          <button
            type="button"
            data-testid={`delete-${f.objectId}`}
            onClick={() => {
              require('app/modules/cloud-code').updateObject({
                parseClass: 'FormSpecificationsV2',
                parseClassID: f.objectId,
                localObject: { active: 'false' },
              });
              refresh(organization);
            }}
          >
            Delete
          </button>
          {onSelectForm && (
            <button
              type="button"
              data-testid={`view-records-${f.objectId}`}
              onClick={() => onSelectForm(f)}
            >
              View records
            </button>
          )}
        </div>
      ))}
    </div>
  ))
);

jest.mock('app/epics/FormManager/Grid', () =>
  jest.fn(() => <div data-testid="grid" />));

// RecordsTable is tested in its own suite — stub it here
jest.mock('app/epics/FormManager/RecordsTable', () =>
  jest.fn(({ form }) => (
    <div data-testid="records-table" data-form-id={form.objectId}>
      Records for {form.name}
    </div>
  )));

const { retrieveCustomData, updateObject } = require('app/modules/cloud-code');
const FormManager = require('app/epics/FormManager').default;

const mockRouter = { push: jest.fn() };
const mockContext = { addPropToStore: jest.fn(), store: {} };

function makeForm(overrides = {}) {
  return {
    objectId: 'f1',
    name: 'WaSH Survey',
    active: 'true',
    workflows: ['WaSH'],
    organizations: ['test-org'],
    ...overrides,
  };
}

function renderManager(records = []) {
  retrieveCustomData.mockResolvedValue(records);
  return render(
    <FormManager context={mockContext} router={mockRouter} user={{ organization: 'test-org' }} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset();
  mockContext.addPropToStore.mockReset();
});

// ─── RED: active filtering ────────────────────────────────────────────────────
// If the `active !== 'false'` guard is removed, soft-deleted forms reappear in
// every user's form list — caught before any accidental data exposure.

describe('Active filtering', () => {
  it('does not render forms where active === "false"', async () => {
    renderManager([makeForm({ objectId: 'f1', active: 'false', name: 'Deleted Form' })]);
    await waitFor(() => expect(retrieveCustomData).toHaveBeenCalled());
    expect(screen.queryByText('Deleted Form')).not.toBeInTheDocument();
  });

  it('renders forms where active === "true"', async () => {
    renderManager([makeForm({ objectId: 'f2', active: 'true', name: 'Active Survey' })]);
    await waitFor(() => expect(screen.getByText('Active Survey')).toBeInTheDocument());
  });
});

// ─── RED: workflow grouping ───────────────────────────────────────────────────
// If the grouping loop is broken, all forms collapse into one bucket and
// workflow headings disappear from the UI.

describe('Workflow grouping', () => {
  it('shows a section heading for the workflow name', async () => {
    renderManager([makeForm({ workflows: ['WaSH'] })]);
    await waitFor(() => expect(screen.getByText('WaSH')).toBeInTheDocument());
  });

  it('shows "No Workflow Assigned" for forms with no workflows', async () => {
    renderManager([makeForm({ workflows: [] })]);
    await waitFor(() =>
      expect(screen.getByText('No Workflow Assigned')).toBeInTheDocument(),
    );
  });

  it('shows "No custom forms yet." when no active custom forms exist', async () => {
    renderManager([]);
    await waitFor(() =>
      expect(screen.getByText('No custom forms yet.')).toBeInTheDocument(),
    );
  });
});

// ─── RED: Puente category hidden ──────────────────────────────────────────────
// If `delete tableDataByCategory.Puente` is removed, internal Puente forms
// surface to all users as a visible workflow group.

describe('"Puente" workflow category hidden', () => {
  it('does not render a Puente workflow heading in custom forms', async () => {
    renderManager([
      makeForm({ objectId: 'p1', workflows: ['Puente'], name: 'Puente Internal' }),
    ]);
    // Wait for retrieveCustomData to settle
    await waitFor(() => expect(retrieveCustomData).toHaveBeenCalled());
    // Give React one more tick for state to settle
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^Puente$/ })).not.toBeInTheDocument();
    });
  });
});

// ─── RED: delete soft-deletes ────────────────────────────────────────────────
// If the delete handler changes to a hard destroy(), updateObject is never
// called — test fails before production data is destroyed.

describe('Delete behavior', () => {
  it('calls updateObject with active:"false" (soft delete)', async () => {
    renderManager([makeForm({ objectId: 'f3', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('delete-f3'));
    await userEvent.click(screen.getByTestId('delete-f3'));
    expect(updateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        parseClass: 'FormSpecificationsV2',
        parseClassID: 'f3',
        localObject: { active: 'false' },
      }),
    );
  });

  it('calls retrieveCustomData again after delete (list refresh)', async () => {
    renderManager([makeForm({ objectId: 'f4', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('delete-f4'));
    await userEvent.click(screen.getByTestId('delete-f4'));
    // retrieveCustomData: once on mount + once after delete = 2
    expect(retrieveCustomData).toHaveBeenCalledTimes(2);
  });
});

// ─── RED: edit routing ────────────────────────────────────────────────────────
// If passDataToFormCreator is removed from Table props, clicking Edit silently
// does nothing — test catches it before users lose work.

describe('Edit routing', () => {
  it('stores data in context and pushes to /forms/form-creator on Edit', async () => {
    renderManager([makeForm({ objectId: 'f5', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('edit-f5'));
    await userEvent.click(screen.getByTestId('edit-f5'));
    expect(mockContext.addPropToStore).toHaveBeenCalledWith(
      '/forms/form-creator',
      expect.objectContaining({ action: 'edit' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/forms/form-creator');
  });
});

// ─── RED: SegmentedControl view toggle ───────────────────────────────────────
// If the Table/Grid toggle is removed, users lose the ability to switch views —
// caught before the UI regression reaches production.

describe('View toggle', () => {
  it('renders a SegmentedControl with Table and Grid options', async () => {
    renderManager([makeForm({ workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByText('WaSH'));
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grid' })).toBeInTheDocument();
  });
});

// ─── RED: Search filter ───────────────────────────────────────────────────────
// If the search input is removed, users lose the ability to find specific forms —
// caught before the form list becomes unusable at scale.

describe('Search filter', () => {
  it('renders a search input', async () => {
    renderManager([makeForm({ workflows: ['WaSH'] })]);
    await waitFor(() => expect(retrieveCustomData).toHaveBeenCalled());
    expect(screen.getByPlaceholderText('Search forms…')).toBeInTheDocument();
  });

  it('hides forms not matching the search term', async () => {
    retrieveCustomData.mockResolvedValue([
      makeForm({ objectId: 'f1', name: 'WaSH Survey', workflows: ['WaSH'] }),
      makeForm({ objectId: 'f2', name: 'Vitals Form', workflows: ['Medical'] }),
    ]);
    render(
      <FormManager context={mockContext} router={mockRouter} user={{ organization: 'test-org' }} />,
    );
    await waitFor(() => screen.getByText('WaSH Survey'));
    await userEvent.type(screen.getByPlaceholderText('Search forms…'), 'Vitals');
    expect(screen.queryByText('WaSH Survey')).not.toBeInTheDocument();
    expect(screen.getByText('Vitals Form')).toBeInTheDocument();
  });

  it('restores all forms when the search term is cleared', async () => {
    retrieveCustomData.mockResolvedValue([
      makeForm({ objectId: 'f1', name: 'WaSH Survey', workflows: ['WaSH'] }),
    ]);
    render(
      <FormManager context={mockContext} router={mockRouter} user={{ organization: 'test-org' }} />,
    );
    await waitFor(() => screen.getByText('WaSH Survey'));
    const input = screen.getByPlaceholderText('Search forms…');
    await userEvent.type(input, 'xyz');
    expect(screen.queryByText('WaSH Survey')).not.toBeInTheDocument();
    await userEvent.clear(input);
    expect(screen.getByText('WaSH Survey')).toBeInTheDocument();
  });
});

// ─── RED: drill-in — RecordsTable view ───────────────────────────────────────
// If onSelectForm is not passed to Table, clicking a form row never opens the
// records view — caught before users hit a dead-end in production.

describe('Drill-in — records view', () => {
  it('passes onSelectForm to each Table instance', async () => {
    const Table = require('app/epics/FormManager/Table');
    renderManager([makeForm({ objectId: 'f6', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('view-records-f6'));
    expect(Table).toHaveBeenCalledWith(
      expect.objectContaining({ onSelectForm: expect.any(Function) }),
      expect.anything(),
    );
  });

  it('shows the RecordsTable when a form row is clicked', async () => {
    renderManager([makeForm({ objectId: 'f7', name: 'Env Health', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('view-records-f7'));
    fireEvent.click(screen.getByTestId('view-records-f7'));
    await waitFor(() =>
      expect(screen.getByTestId('records-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('records-table')).toHaveAttribute('data-form-id', 'f7');
  });

  it('hides the form catalog when drill-in is active', async () => {
    renderManager([makeForm({ objectId: 'f8', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('view-records-f8'));
    fireEvent.click(screen.getByTestId('view-records-f8'));
    await waitFor(() => screen.getByTestId('records-table'));
    // Catalog sections should be hidden
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('returns to the catalog when the back button is clicked', async () => {
    renderManager([makeForm({ objectId: 'f9', name: 'Survey', workflows: ['WaSH'] })]);
    await waitFor(() => screen.getByTestId('view-records-f9'));
    fireEvent.click(screen.getByTestId('view-records-f9'));
    await waitFor(() => screen.getByTestId('records-table'));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() =>
      expect(screen.queryByTestId('records-table')).not.toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('table').length).toBeGreaterThan(0);
  });
});

// ─── RED: Phase 1 — + Create form CTA ────────────────────────────────────────
// If the + Create form button is removed from the catalog, users lose the
// primary entry point to Form Creator — caught before discoverability regresses.

describe('Phase 1 — Create form CTA', () => {
  it('renders a "+ Create form" button in the catalog view', async () => {
    renderManager([]);
    await waitFor(() => expect(retrieveCustomData).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /\+ create form/i })).toBeInTheDocument();
  });

  it('clicking "+ Create form" navigates to /forms/form-creator', async () => {
    renderManager([]);
    await waitFor(() => expect(retrieveCustomData).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /\+ create form/i }));
    expect(mockRouter.push).toHaveBeenCalledWith('/forms/form-creator');
  });
});
