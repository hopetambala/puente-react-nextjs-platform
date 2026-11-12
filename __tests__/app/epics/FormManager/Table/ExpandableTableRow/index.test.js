import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars
      ? `${k}(${Object.entries(vars).map(([n, v]) => `${n}=${v}`).join(',')})`
      : k),
  }),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

const mockScope = jest.fn();
jest.mock('app/modules/organization', () => ({
  loadOrganizationScope: (...args) => mockScope(...args),
}));

const mockQueries = [];
jest.mock('parse', () => {
  function Query(className) {
    this.className = className;
    this.calls = [];
    mockQueries.push(this);
  }
  ['equalTo', 'containedIn', 'descending'].forEach((name) => {
    Query.prototype[name] = function record(...args) { this.calls.push([name, ...args]); return this; };
  });
  Query.prototype.count = function count() { return Promise.resolve(this.className === 'Vitals' ? 14799 : 561); };
  return { Parse: { Query }, Query };
});

beforeEach(() => {
  mockQueries.length = 0;
  mockScope.mockReset();
  mockScope.mockResolvedValue(['WOF', 'HOF']);
});

const ExpandableTableRow = require('app/epics/FormManager/Table/ExpandableTableRow').default;

function renderRow() {
  return render(
    <table>
      <tbody>
        <ExpandableTableRow row={{ objectId: 'f1' }} name="WaSH Survey" surveyingOrganization="TestOrg">
          <td>WaSH Survey</td>
        </ExpandableTableRow>
      </tbody>
    </table>,
  );
}

const toggleName = (name) => `form_manager_row_details(name=${name})`;

// The toggle was "Expand row" on every row, its state only in its label, and
// its ▼ glyph read aloud. It now names its form and states its state.
describe('ExpandableTableRow — the toggle', () => {
  it('names the form whose details it shows, and says whether they are open', () => {
    renderRow();
    const toggle = screen.getByRole('button', { name: toggleName('WaSH Survey') });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const details = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(details).not.toBeNull();
    expect(details).toHaveTextContent(/form_manager_records_collected|form_manager_counting/);
  });

  it('hides the arrow glyph from assistive tech', () => {
    renderRow();
    const toggle = screen.getByRole('button', { name: toggleName('WaSH Survey') });
    expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(toggle).not.toHaveTextContent(/[▲▼]/);
  });

  it('spans the detail row across every column', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: toggleName('WaSH Survey') }));
    const cells = document.querySelectorAll('tr:last-child td');
    const span = Array.from(cells).reduce((n, td) => n + (td.colSpan || 1), 0);
    expect(span).toBe(4);
  });
});

describe('ExpandableTableRow — copy', () => {
  // X15: "Forms collected: N" counted records.
  it('counts records, not forms, as soon as the details open', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: toggleName('WaSH Survey') }));
    await waitFor(() => {
      // The custom form's FormResults count, not the 0 it used to show
      // before anything was counted.
      expect(screen.getByText('form_manager_records_collected(count=561)')).toBeInTheDocument();
    });
  });

  it('routes the refresh control through t()', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: toggleName('WaSH Survey') }));
    expect(screen.getByRole('button', { name: 'action_refresh' })).toBeInTheDocument();
  });
});

// Hover tooltips never reach keyboard or touch users, so what each file
// contains is said in the open, in the row's detail.
describe('ExpandableTableRow — research export', () => {
  const expand = (row, offersResearch = false) => {
    render(
      <table>
        <tbody>
          <ExpandableTableRow row={row} name="Vision exam" surveyingOrganization="McMaster" offersResearch={offersResearch}>
            <td>Vision exam</td>
          </ExpandableTableRow>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('button', { name: toggleName('Vision exam') }));
  };

  it('says what each file contains on a research-enabled form', () => {
    expand({ objectId: 'f1', customForm: true, allowResearchExport: true }, true);
    expect(screen.getByText('form_manager_research_file_contents')).toBeInTheDocument();
    expect(screen.getByText('form_manager_full_records_contents')).toBeInTheDocument();
  });

  it('says nothing about research when the row has no research file', () => {
    // allowResearchExport alone is not enough: without a short code there is
    // no research button, so the notes would describe a file nobody can get.
    expand({ objectId: 'f1', customForm: true, allowResearchExport: true }, false);
    expect(screen.queryByText('form_manager_research_file_contents')).not.toBeInTheDocument();
  });
});

// Field report, 2026-11-06: an HOF coordinator expanded Vitals and read
// "0 collected" — the count asked FormResults, where no vital has ever lived.
describe('ExpandableTableRow — collected count', () => {
  // The count used to show a false "0" until Refresh was pressed. It now
  // loads when the details open.
  const expandAndRefresh = (row, org = 'WOF') => {
    render(
      <table>
        <tbody>
          <ExpandableTableRow row={row} name={row.name} surveyingOrganization={org}>
            <td>{row.name}</td>
          </ExpandableTableRow>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('button', { name: toggleName(row.name) }));
  };

  it('counts the Vitals card in the Vitals class, across every name of the organization', async () => {
    expandAndRefresh({ name: 'Vitals', description: '' });
    await waitFor(() => expect(screen.getByText('form_manager_records_collected(count=14799)')).toBeInTheDocument());
    expect(mockQueries.map((q) => q.className)).toEqual(['Vitals']);
    expect(mockQueries[0].calls).toContainEqual(['containedIn', 'surveyingOrganization', ['WOF', 'HOF']]);
  });

  it('counts a custom form in FormResults by its id, across every name of the organization', async () => {
    mockScope.mockResolvedValue(['Constanza Medical Mission', 'CMM']);
    expandAndRefresh({ objectId: 'MYt04Zp4ok', name: 'Seguimiento', customForm: true }, 'Constanza Medical Mission');
    await waitFor(() => expect(screen.getByText('form_manager_records_collected(count=561)')).toBeInTheDocument());
    expect(mockQueries[0].className).toBe('FormResults');
    expect(mockQueries[0].calls).toContainEqual(['equalTo', 'formSpecificationsId', 'MYt04Zp4ok']);
    expect(mockQueries[0].calls).toContainEqual(['containedIn', 'surveyingOrganization', ['Constanza Medical Mission', 'CMM']]);
  });

  it('shows 0 and queries nothing when the organization has no scope', async () => {
    mockScope.mockResolvedValue([]);
    expandAndRefresh({ name: 'Vitals' });
    await waitFor(() => expect(mockScope).toHaveBeenCalled());
    expect(mockQueries).toHaveLength(0);
    expect(await screen.findByText('form_manager_records_collected(count=0)')).toBeInTheDocument();
  });

  it('never shows a count before one has loaded', () => {
    mockScope.mockReturnValue(new Promise(() => {}));
    expandAndRefresh({ name: 'Vitals' });
    expect(screen.queryByText(/form_manager_records_collected/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('form_manager_counting');
  });

  it('counts again from Refresh', async () => {
    expandAndRefresh({ name: 'Vitals' });
    await screen.findByText('form_manager_records_collected(count=14799)');
    fireEvent.click(screen.getByRole('button', { name: 'action_refresh' }));
    await waitFor(() => expect(mockQueries).toHaveLength(2));
  });
});

// "Forms collected: 0" after a failed count is the exact false zero this
// fix exists to remove.
describe('ExpandableTableRow — failed count', () => {
  it('says the count did not load instead of showing 0', async () => {
    mockScope.mockRejectedValueOnce(new Error('offline'));
    render(
      <table>
        <tbody>
          <ExpandableTableRow row={{ name: 'Vitals' }} name="Vitals" surveyingOrganization="WOF">
            <td>Vitals</td>
          </ExpandableTableRow>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('button', { name: toggleName('Vitals') }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('form_manager_records_error'));
    expect(screen.queryByText('form_manager_records_collected(count=0)')).not.toBeInTheDocument();
  });
});
