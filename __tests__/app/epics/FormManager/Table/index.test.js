import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── RED: Status badge missing ────────────────────────────────────────────────
// If the Status column is removed from the Table, the green "Active" badge
// disappears from every form row — caught before users see a bare table.

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
  retrieveCustomData: jest.fn(),
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
      retrieveCustomData={mockFns.retrieveCustomData}
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

  it('shows "—" when description is absent', () => {
    renderTable([makeRow({ description: undefined })]);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a Status column header', () => {
    renderTable([makeRow()]);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});

describe('Status badge', () => {
  it('renders a green Active badge for each form row', () => {
    renderTable([makeRow()]);
    expect(screen.getByTestId('badge-green')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders one badge per row', () => {
    renderTable([makeRow(), makeRow({ objectId: 'r2', name: 'Form B' })]);
    expect(screen.getAllByTestId('badge-green')).toHaveLength(2);
  });
});

describe('Actions — custom forms', () => {
  it('renders Edit, Duplicate, and Delete buttons', () => {
    renderTable([makeRow()]);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
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
    await userEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('calls updateObject with active:false when deletion is confirmed', async () => {
    renderTable([makeRow({ objectId: 'form-99' })]);
    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Delete form'));
    expect(updateObject).toHaveBeenCalledWith(
      expect.objectContaining({ parseClassID: 'form-99', localObject: { active: 'false' } }),
    );
  });
});
