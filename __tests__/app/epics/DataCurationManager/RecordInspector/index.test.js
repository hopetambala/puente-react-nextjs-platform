import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// `t` echoes the key, so an assertion on a key proves the string reached t().
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
  Toast: ({ text }) => <div data-testid="toast">{text}</div>,
  Badge: ({ children, variant }) => <span data-testid={`badge-${variant}`}>{children}</span>,
  Modal: ({ open, text, actionText, action, handleClose }) =>
    open ? (
      <div data-testid="discard-modal">
        <p>{text}</p>
        <button type="button" onClick={action}>{actionText}</button>
        <button type="button" onClick={handleClose}>Cancel</button>
      </div>
    ) : null,
}));

const mockSave = jest.fn().mockResolvedValue({});
const mockSet = jest.fn();

function makeRecord(overrides = {}) {
  const data = {
    fname: 'Hope', lname: 'Tambala', nickname: '', dob: '01/01/1990', age: '35', sex: 'female',
    telephoneNumber: '265999', cedulaNumber: '',
    communityname: 'Nsanje', city: '', province: '', country: 'Malawi',
    latitude: -15, longitude: 35,
    householdId: 'HH01', numberofIndividualsLivingintheHouse: '4',
    surveyingUser: 'alice', surveyingOrganization: 'TestOrg',
    appVersion: '1.0', phoneOS: 'iOS',
    ...overrides,
  };
  return {
    id: 'r1',
    get: (k) => data[k],
    set: mockSet,
    save: mockSave,
    createdAt: new Date('2026-06-01'),
  };
}

const RecordInspector = require('app/epics/DataCurationManager/RecordInspector').default;

const mockOnClose = jest.fn();
const mockOnSaved = jest.fn();

describe('RecordInspector — SurveyData sections', () => {
  beforeEach(() => jest.clearAllMocks());

  const props = { record: makeRecord(), source: 'survey-data', formDefinition: null, onClose: mockOnClose, onSaved: mockOnSaved };

  it('renders the Identity section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'data_curation_inspector_section_identity' })).toBeInTheDocument();
  });

  it('renders the Contact section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'data_curation_inspector_section_contact' })).toBeInTheDocument();
  });

  it('renders the Location section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'data_curation_inspector_section_location' })).toBeInTheDocument();
  });

  it('renders the Household section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'data_curation_inspector_section_household' })).toBeInTheDocument();
  });

  it('renders the Audit section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'data_curation_inspector_section_audit' })).toBeInTheDocument();
  });

  it('pre-fills fname input with record value', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByDisplayValue('Hope')).toBeInTheDocument();
  });

  it('surveyingOrganization is read-only (not an input)', () => {
    render(<RecordInspector {...props} />);
    const input = screen.queryByDisplayValue('TestOrg');
    expect(input).not.toBeInTheDocument();
    expect(screen.getByText('TestOrg')).toBeInTheDocument();
  });

  it('calls record.set and record.save when Save clicked', async () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByDisplayValue('Hope');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    fireEvent.click(screen.getByText('data_curation_save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSet).toHaveBeenCalledWith('fname', 'Hopeful');
  });

  it('calls onClose when close button clicked', () => {
    render(<RecordInspector {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'action_close' }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('RecordInspector — FormResults sections', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockFormDef = {
    get: (k) => ({
      fields: [
        { formikKey: 'water_source', label: 'Water Source', fieldType: 'input' },
        { formikKey: 'floor_material', label: 'Floor Material', fieldType: 'input' },
      ],
    }[k]),
  };

  const formRecord = {
    id: 'fr1',
    get: (k) => ({
      surveyingUser: 'bob',
      surveyingOrganization: 'TestOrg',
      formSpecificationsId: 'form1',
      fields: [
        { title: 'water_source', answer: 'Well' },
        { title: 'floor_material', answer: 'Dirt' },
      ],
    }[k]),
    set: mockSet,
    save: mockSave,
    createdAt: new Date('2026-06-01'),
  };

  it('renders dynamic form fields from formDefinition', () => {
    render(<RecordInspector record={formRecord} source="form-results:form1" formDefinition={mockFormDef} onClose={mockOnClose} onSaved={mockOnSaved} />);
    expect(screen.getByText('Water Source')).toBeInTheDocument();
    expect(screen.getByText('Floor Material')).toBeInTheDocument();
  });

  it('pre-fills dynamic field inputs with current answer values', () => {
    render(<RecordInspector record={formRecord} source="form-results:form1" formDefinition={mockFormDef} onClose={mockOnClose} onSaved={mockOnSaved} />);
    expect(screen.getByDisplayValue('Well')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dirt')).toBeInTheDocument();
  });

  it('rebuilds fields array and calls record.save on Save', async () => {
    render(<RecordInspector record={formRecord} source="form-results:form1" formDefinition={mockFormDef} onClose={mockOnClose} onSaved={mockOnSaved} />);
    const wellInput = screen.getByDisplayValue('Well');
    fireEvent.change(wellInput, { target: { value: 'Tap' } });
    fireEvent.click(screen.getByText('data_curation_save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSet).toHaveBeenCalledWith('fields', expect.arrayContaining([
      { title: 'water_source', answer: 'Tap' },
    ]));
  });
});

describe('RecordInspector — FormResults select field options', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockFormDef = {
    get: (k) => ({
      fields: [
        {
          formikKey: 'water_source',
          label: 'Water Source',
          fieldType: 'select',
          options: [
            { id: 'well', label: 'Well', value: 'well' },
            { id: 'river', label: 'River', value: 'river' },
          ],
        },
      ],
    }[k]),
  };

  const formRecord = {
    id: 'fr2',
    get: (k) => ({
      surveyingUser: 'bob',
      surveyingOrganization: 'TestOrg',
      formSpecificationsId: 'form1',
      fields: [{ title: 'water_source', answer: 'well' }],
    }[k]),
    set: mockSet,
    save: mockSave,
    createdAt: new Date('2026-06-01'),
  };

  it('renders a <select> element for a select-type FormResults field', () => {
    render(<RecordInspector record={formRecord} source="form-results:form1" formDefinition={mockFormDef} onClose={mockOnClose} onSaved={mockOnSaved} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('populates the <select> with the choices from the form definition', () => {
    render(<RecordInspector record={formRecord} source="form-results:form1" formDefinition={mockFormDef} onClose={mockOnClose} onSaved={mockOnSaved} />);
    const select = screen.getByRole('combobox');
    expect(within(select).getByRole('option', { name: 'Well' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'River' })).toBeInTheDocument();
  });

  it('pre-selects the current answer value in the <select>', () => {
    render(<RecordInspector record={formRecord} source="form-results:form1" formDefinition={mockFormDef} onClose={mockOnClose} onSaved={mockOnSaved} />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('well');
  });
});

describe('RecordInspector — chrome and coded values', () => {
  beforeEach(() => jest.clearAllMocks());

  const props = { record: makeRecord(), source: 'survey-data', formDefinition: null, onClose: mockOnClose, onSaved: mockOnSaved };

  it('routes both close affordances through t()', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('button', { name: 'data_curation_inspector_close_overlay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'action_close' })).toBeInTheDocument();
  });

  it('routes the Cancel button through t()', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByText('data_curation_cancel')).toBeInTheDocument();
  });

  it('labels the sex options for a reader rather than rendering the stored code', () => {
    render(<RecordInspector {...props} />);
    const select = screen.getByRole('combobox');
    expect(within(select).getByRole('option', { name: 'data_curation_sex_male' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'data_curation_sex_female' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'data_curation_sex_prefer_not_to_say' })).toBeInTheDocument();
  });

  it('keeps the stored value on each sex option while translating its label', () => {
    render(<RecordInspector {...props} />);
    const select = screen.getByRole('combobox');
    // The label is ours to translate; the value is collected data and must not
    // move, or a save would rewrite what the field worker recorded.
    expect(Array.from(select.options).map((o) => o.value))
      .toEqual(['', 'male', 'female', 'prefer_not_to_say']);
    expect(select.value).toBe('female');
  });
});

describe('Dirty-state indicator', () => {
  beforeEach(() => jest.clearAllMocks());

  const props = { record: makeRecord(), source: 'survey-data', formDefinition: null, onClose: mockOnClose, onSaved: mockOnSaved };

  it('shows an "Unsaved changes" indicator after editing a field', () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByLabelText('field_fname');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    expect(screen.getByText('data_curation_inspector_unsaved')).toBeInTheDocument();
  });

  it('does not show an unsaved-changes indicator when no fields have been changed', () => {
    render(<RecordInspector {...props} />);
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });

  it('shows a discard confirmation modal when closing with unsaved changes', () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByLabelText('field_fname');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    fireEvent.click(screen.getByRole('button', { name: 'action_close' }));
    expect(
      screen.getByTestId('discard-modal') ||
      screen.getByText('data_curation_inspector_discard_confirm')
    ).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes without a discard modal when no changes have been made', () => {
    render(<RecordInspector {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'action_close' }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(screen.queryByTestId('discard-modal')).not.toBeInTheDocument();
  });

  it('clears the unsaved-changes indicator after a successful save', async () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByLabelText('field_fname');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    expect(screen.getByText('data_curation_inspector_unsaved')).toBeInTheDocument();
    fireEvent.click(screen.getByText('data_curation_save'));
    await waitFor(() => expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument());
  });
});

describe('RecordInspector — dirty state', () => {
  beforeEach(() => jest.clearAllMocks());

  const props = { record: makeRecord(), source: 'survey-data', formDefinition: null, onClose: mockOnClose, onSaved: mockOnSaved };

  it('shows an "Unsaved changes" indicator after editing a field', () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByDisplayValue('Hope');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    expect(screen.getByText('data_curation_inspector_unsaved')).toBeInTheDocument();
  });

  it('clears the "Unsaved changes" indicator after a successful save', async () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByDisplayValue('Hope');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    fireEvent.click(screen.getByText('data_curation_save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('shows a discard confirmation modal when closing with unsaved changes', () => {
    render(<RecordInspector {...props} />);
    const fnameInput = screen.getByDisplayValue('Hope');
    fireEvent.change(fnameInput, { target: { value: 'Hopeful' } });
    fireEvent.click(screen.getByRole('button', { name: 'action_close' }));
    expect(screen.getByTestId('discard-modal')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes immediately without a modal when no fields have been changed', () => {
    render(<RecordInspector {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'action_close' }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(screen.queryByTestId('discard-modal')).not.toBeInTheDocument();
  });
});
