import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: () => ({ get: (k) => ({ organization: 'TestOrg' }[k]) }),
}));

const mockFormsFindFn = jest.fn().mockResolvedValue([]);

jest.mock('parse', () => ({
  Parse: {
    Query: jest.fn(() => ({
      equalTo: jest.fn().mockReturnThis(),
      find: mockFormsFindFn,
    })),
    Object: { extend: jest.fn(() => ({})) },
  },
}));

jest.mock('app/services/parse', () => ({ initialize: jest.fn() }));

// Import after mocks
const SourceSelector = require('app/epics/DataCurationManager/SourceSelector').default;

const mockOnChange = jest.fn();

describe('SourceSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormsFindFn.mockResolvedValue([]);
  });

  it('renders People Records as the default selected option', async () => {
    render(<SourceSelector source="survey-data" org="TestOrg" onChange={mockOnChange} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue(/People Records/i)).toBeInTheDocument();
    });
  });

  it('renders fixed source options (EvaluationMedical, Vitals, EnvironmentalHealth)', async () => {
    render(<SourceSelector source="survey-data" org="TestOrg" onChange={mockOnChange} />);
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
    const options = screen.getAllByRole('option');
    const labels = options.map((o) => o.textContent);
    expect(labels).toEqual(expect.arrayContaining(['People Records']));
    expect(labels).toEqual(expect.arrayContaining(['Medical Evaluation']));
    expect(labels).toEqual(expect.arrayContaining(['Vitals']));
    expect(labels).toEqual(expect.arrayContaining(['Environmental Health']));
  });

  it('renders one option per FormSpecificationsV2 returned from Parse', async () => {
    const mockForm = { id: 'form1', get: (k) => ({ name: 'WaSH Survey' }[k]) };
    mockFormsFindFn.mockResolvedValue([mockForm]);

    render(<SourceSelector source="survey-data" org="TestOrg" onChange={mockOnChange} />);
    await waitFor(() => {
      expect(screen.getByText('WaSH Survey')).toBeInTheDocument();
    });
  });

  it('calls onChange with form-results:<id> when a custom form is selected', async () => {
    const mockForm = { id: 'form1', get: (k) => ({ name: 'WaSH Survey' }[k]) };
    mockFormsFindFn.mockResolvedValue([mockForm]);

    render(<SourceSelector source="survey-data" org="TestOrg" onChange={mockOnChange} />);
    await waitFor(() => screen.getByText('WaSH Survey'));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'form-results:form1' } });
    expect(mockOnChange).toHaveBeenCalledWith('form-results:form1');
  });

  it('calls onChange with eval-medical when Medical Evaluation selected', async () => {
    render(<SourceSelector source="survey-data" org="TestOrg" onChange={mockOnChange} />);
    await waitFor(() => screen.getByRole('combobox'));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'eval-medical' } });
    expect(mockOnChange).toHaveBeenCalledWith('eval-medical');
  });
});
