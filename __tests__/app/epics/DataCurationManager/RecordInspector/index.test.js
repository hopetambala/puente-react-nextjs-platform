import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
  Toast: ({ text }) => <div data-testid="toast">{text}</div>,
  Badge: ({ children, variant }) => <span data-testid={`badge-${variant}`}>{children}</span>,
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
    expect(screen.getByRole('heading', { name: 'Identity' })).toBeInTheDocument();
  });

  it('renders the Contact section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
  });

  it('renders the Location section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument();
  });

  it('renders the Household section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'Household' })).toBeInTheDocument();
  });

  it('renders the Audit section', () => {
    render(<RecordInspector {...props} />);
    expect(screen.getByRole('heading', { name: 'Audit' })).toBeInTheDocument();
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
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSet).toHaveBeenCalledWith('fname', 'Hopeful');
  });

  it('calls onClose when close button clicked', () => {
    render(<RecordInspector {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
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
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSet).toHaveBeenCalledWith('fields', expect.arrayContaining([
      { title: 'water_source', answer: 'Tap' },
    ]));
  });
});
