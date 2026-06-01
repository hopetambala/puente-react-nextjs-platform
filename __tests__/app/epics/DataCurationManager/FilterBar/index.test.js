import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('app/impacto-design-system', () => ({
  SegmentedControl: ({ options, value, onChange }) => (
    <div>
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

const FilterBar = require('app/epics/DataCurationManager/FilterBar').default;

const mockOnFilterChange = jest.fn();

const defaultProps = {
  surveyors: ['alice', 'bob'],
  communities: ['Nsanje', 'Blantyre'],
  onFilterChange: mockOnFilterChange,
  loading: false,
};

describe('FilterBar — rendering', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the search input', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders the surveyor dropdown with provided options', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('renders the community dropdown with provided options', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('Nsanje')).toBeInTheDocument();
    expect(screen.getByText('Blantyre')).toBeInTheDocument();
  });

  it('renders Status SegmentedControl with Duplicates/Anomalies/Clean options', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
    expect(screen.getByText('Clean')).toBeInTheDocument();
  });

  it('renders a Completeness SegmentedControl with ≥ 80% and < 60% options', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('≥ 80%')).toBeInTheDocument();
    expect(screen.getByText('< 60%')).toBeInTheDocument();
  });
});

describe('FilterBar — interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls onFilterChange with search value after debounce', async () => {
    jest.useFakeTimers();
    render(<FilterBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'hope' } });
    act(() => jest.advanceTimersByTime(350));
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'hope' }));
    jest.useRealTimers();
  });

  it('calls onFilterChange when surveyor selected', () => {
    render(<FilterBar {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    const surveyorSelect = selects[0];
    fireEvent.change(surveyorSelect, { target: { value: 'alice' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ surveyor: 'alice' }));
  });

  it('calls onFilterChange with status=duplicates when Duplicates button clicked', () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByText('Duplicates'));
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'duplicates' }));
  });

  it('calls onFilterChange with community when community selected', () => {
    render(<FilterBar {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    const communitySelect = selects[1];
    fireEvent.change(communitySelect, { target: { value: 'Nsanje' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ community: 'Nsanje' }));
  });
});
