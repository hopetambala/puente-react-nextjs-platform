import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `t` echoes the key, plus its interpolation values when it has any, so a test
// can tell which form a sentence names.
jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k, v) => (v ? `${k} ${JSON.stringify(v)}` : k) }),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick, intent }) => (
    <button type="button" data-intent={intent} onClick={onClick}>{text}</button>
  ),
  Modal: ({ open, handleClose, text, actionText, action }) =>
    open ? (
      <div data-testid="modal">
        <p>{text}</p>
        <button type="button" onClick={action}>{actionText}</button>
        <button type="button" onClick={handleClose}>Close</button>
      </div>
    ) : null,
  Badge: ({ children, variant }) => (
    <span data-testid={`badge-${variant}`}>{children}</span>
  ),
}));

jest.mock('app/modules/cloud-code', () => ({
  updateObject: jest.fn().mockResolvedValue({}),
}));

jest.mock('app/epics/FormManager/Table/CSVButton', () =>
  jest.fn(() => null));

jest.mock('app/epics/FormManager/Table/ExpandableTableRow', () =>
  jest.fn(({ children }) => <tr>{children}</tr>));

const { updateObject } = require('app/modules/cloud-code');
const FormManagerTable = require('app/epics/FormManager/Table').default;

const mockFns = {
  onFormRemoved: jest.fn(),
  passDataToFormCreator: jest.fn(),
};

const makeRow = (overrides = {}) => ({
  objectId: 'r1',
  name: 'WaSH Survey',
  description: 'Water survey',
  organizations: ['test-org'],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
  ...overrides,
});

function renderTable(rows, puenteForm = false) {
  return render(
    <FormManagerTable
      data={rows}
      onFormRemoved={mockFns.onFormRemoved}
      passDataToFormCreator={mockFns.passDataToFormCreator}
      organization="test-org"
      puenteForm={puenteForm}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('Rendering', () => {
  it('renders a row for each form', () => {
    renderTable([makeRow({ name: 'Form A' }), makeRow({ objectId: 'r2', name: 'Form B' })]);
    expect(screen.getByText('Form A')).toBeInTheDocument();
    expect(screen.getByText('Form B')).toBeInTheDocument();
  });

  // The description column was hidden below 1440px, so most screens never
  // showed it. It now sits under the form's name, at every width.
  it("shows the description under the form's name", () => {
    renderTable([makeRow({ description: 'Water survey' })]);
    const nameCell = screen.getByText('WaSH Survey').closest('td');
    expect(nameCell).toHaveTextContent('Water survey');
  });

  it('shows no description line when there is none', () => {
    renderTable([makeRow({ description: undefined })]);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  // Below 40rem of container the rows become cards (CSS); these are what keep
  // that layout readable and announced as a table.
  it('keeps table semantics and labels each cell for the stacked layout', () => {
    renderTable([makeRow()]);
    expect(screen.getByRole('table')).toBeInTheDocument();
    const cells = screen.getAllByRole('cell');
    const labels = cells.map((c) => c.getAttribute('data-label'));
    expect(labels).toEqual(expect.arrayContaining(['form_manager_col_updated', 'form_manager_col_actions']));
  });

});

// Design review X14: every row's badge read "Active", because removed forms
// are never listed. A column that never varies says nothing and cost the
// table the width its Actions column needed at 768 (C6).
describe('No status column', () => {
  it('has no Status column and no Active badge', () => {
    renderTable([makeRow(), makeRow({ objectId: 'r2', name: 'Form B' })]);
    expect(screen.queryByText('field_status')).not.toBeInTheDocument();
    expect(screen.queryByText('form_manager_status_active')).not.toBeInTheDocument();
  });
});

// Design review X14: the Puente cards showed Parse class names ("SurveyData",
// "HistoryEnvironmentalHealth") where curation shows the same forms by name.
describe('Puente form names', () => {
  it('shows a Puente form by its translated name, not its class', () => {
    renderTable([{ name: 'SurveyData', labelKey: 'data_curation_source_survey_data', description: '' }], true);
    expect(screen.getByText('data_curation_source_survey_data')).toBeInTheDocument();
    expect(screen.queryByText('SurveyData')).not.toBeInTheDocument();
  });

  it("shows a custom form's own name as written", () => {
    renderTable([makeRow({ name: 'Lecturas 2026' })]);
    expect(screen.getByText('Lecturas 2026')).toBeInTheDocument();
  });
});

describe('Actions — custom forms', () => {
  it('renders Edit, Duplicate, and Delete buttons', () => {
    renderTable([makeRow()]);
    expect(screen.getByText('form_manager_edit')).toBeInTheDocument();
    expect(screen.getByText('form_manager_duplicate')).toBeInTheDocument();
    expect(screen.getByText('form_manager_delete')).toBeInTheDocument();
  });
});

describe('Actions — Puente forms', () => {
  it('does not render Edit or Delete for Puente forms', () => {
    renderTable([makeRow()], true);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});

describe('Drill-in to records', () => {
  // Clicking a form's name must call onSelectForm(row) so the parent can open
  // the RecordsTable drill-in view. Without this wiring that view is unreachable.
  it('calls onSelectForm with the row when the form name is clicked', async () => {
    const onSelectForm = jest.fn();
    const row = makeRow({ name: 'WaSH Survey' });
    render(
      <FormManagerTable
        data={[row]}
        retrieveCustomData={mockFns.retrieveCustomData}
        passDataToFormCreator={mockFns.passDataToFormCreator}
        organization="test-org"
        onSelectForm={onSelectForm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'WaSH Survey' }));
    expect(onSelectForm).toHaveBeenCalledWith(row);
  });
});

describe('Delete modal', () => {
  it('shows confirmation modal when Delete is clicked', async () => {
    renderTable([makeRow()]);
    await userEvent.click(screen.getByText('form_manager_delete'));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('calls updateObject with active:false when deletion is confirmed', async () => {
    renderTable([makeRow({ objectId: 'form-99' })]);
    await userEvent.click(screen.getByText('form_manager_delete'));
    await userEvent.click(screen.getByText('form_manager_delete_action'));
    expect(updateObject).toHaveBeenCalledWith(
      expect.objectContaining({ parseClassID: 'form-99', localObject: { active: 'false' } }),
    );
  });

  // X12: "Do you want to remove this form?" named no form and didn't say what
  // happens to the records collected with it.
  it('names the form in the confirmation', async () => {
    renderTable([makeRow({ name: 'WaSH Survey' })]);
    await userEvent.click(screen.getByText('form_manager_delete'));
    expect(screen.getByText('form_manager_delete_confirm {"name":"WaSH Survey"}')).toBeInTheDocument();
  });

  // The list used to call retrieveCustomData and drop the answer, without
  // waiting for the delete: the removed form stayed on screen.
  it('tells the page once the server has removed the form', async () => {
    let finish;
    updateObject.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const row = makeRow({ objectId: 'form-7' });
    renderTable([row]);
    await userEvent.click(screen.getByText('form_manager_delete'));
    await userEvent.click(screen.getByText('form_manager_delete_action'));
    expect(mockFns.onFormRemoved).not.toHaveBeenCalled();
    await act(async () => finish({}));
    expect(mockFns.onFormRemoved).toHaveBeenCalledWith(row);
  });

  it('says so when the delete fails, and keeps the form', async () => {
    updateObject.mockRejectedValueOnce(new Error('offline'));
    renderTable([makeRow({ name: 'WaSH Survey' })]);
    await userEvent.click(screen.getByText('form_manager_delete'));
    await userEvent.click(screen.getByText('form_manager_delete_action'));
    expect(await screen.findByRole('alert')).toHaveTextContent('form_manager_delete_failed {"name":"WaSH Survey"}');
    expect(mockFns.onFormRemoved).not.toHaveBeenCalled();
  });
});

describe('FormManagerTable — copy', () => {
  it('routes every column header through t()', () => {
    renderTable([makeRow()]);
    ['form_manager_col_name', 'form_manager_col_updated', 'form_manager_col_actions'].forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
  });

  it('routes the caret column label through t()', () => {
    renderTable([makeRow()]);
    expect(screen.getByRole('columnheader', { name: 'form_manager_col_expand' })).toBeInTheDocument();
  });

  // The two empty states are different: no data at all reaches this component
  // as `undefined`, which is not the same as a filter excluding everything.
  it('routes the no-data empty state through t()', () => {
    renderTable(undefined);
    expect(screen.getByText('form_manager_empty')).toBeInTheDocument();
  });

  it('routes the delete confirmation body through t()', async () => {
    renderTable([makeRow()]);
    await userEvent.click(screen.getAllByText('form_manager_delete')[0]);
    expect(screen.getByText(/^form_manager_delete_confirm/)).toBeInTheDocument();
  });
});

// A form whose owner turned research export on says so in words, in the row,
// so a coordinator can see which forms have a file safe to send outside Puente.
describe('FormManagerTable — research export', () => {
  const renderRows = (rows) => render(
    <FormManagerTable data={rows} organization="McMaster" shortCode="mcmaster" {...mockFns} />,
  );

  it('labels a research-enabled form under its name', () => {
    renderRows([makeRow({ customForm: true, allowResearchExport: true })]);
    expect(screen.getByText('form_manager_research_badge')).toBeInTheDocument();
  });

  it('claims no research file the row cannot download (no short code)', () => {
    render(<FormManagerTable
      data={[makeRow({ customForm: true, allowResearchExport: true })]}
      organization="Unresolved"
      shortCode={null}
      {...mockFns}
    />);
    expect(screen.queryByText('form_manager_research_badge')).not.toBeInTheDocument();
    expect(require('app/epics/FormManager/Table/ExpandableTableRow').mock.calls[0][0].offersResearch).toBe(false);
  });

  it('labels no other form', () => {
    renderRows([makeRow()]);
    expect(screen.queryByText('form_manager_research_badge')).not.toBeInTheDocument();
  });
});
