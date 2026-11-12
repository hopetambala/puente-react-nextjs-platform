import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { axe } from '../../../../../__test-utils__/axe';

// `t` echoes the key, so an assertion on a key proves the string reached
// `t()`. A literal that never did renders its English and fails here — which
// is the whole point: a green build and a green suite cannot otherwise tell
// the difference between a translated string and an English one.
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  SegmentedControl: ({
    options, value, onChange, label,
  }) => (
    <div role="group" aria-label={label}>
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
    expect(screen.getByPlaceholderText('data_curation_search_placeholder')).toBeInTheDocument();
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
    expect(screen.getByText('data_curation_status_duplicates')).toBeInTheDocument();
    expect(screen.getByText('data_curation_status_anomalies')).toBeInTheDocument();
    expect(screen.getByText('data_curation_status_clean')).toBeInTheDocument();
  });

  it('renders a Completeness SegmentedControl with the high and low thresholds', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('data_curation_completeness_high')).toBeInTheDocument();
    expect(screen.getByText('data_curation_completeness_low')).toBeInTheDocument();
  });

  it('routes both empty-selection option labels through t()', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('data_curation_all_surveyors')).toBeInTheDocument();
    expect(screen.getByText('data_curation_all_communities')).toBeInTheDocument();
  });
});

describe('FilterBar — interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls onFilterChange with search value after debounce', async () => {
    jest.useFakeTimers();
    render(<FilterBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('data_curation_search_placeholder'), { target: { value: 'hope' } });
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
    fireEvent.click(screen.getByText('data_curation_status_duplicates'));
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

// Every control says what it filters. The selects were named only by their
// first option ("All surveyors"), which axe reports as select-name and a screen
// reader announces as a bare "combo box"; the search had only a placeholder,
// which vanishes as soon as someone types (WCAG 1.3.1, 3.3.2, 4.1.2).
describe('FilterBar — names', () => {
  it('labels the search field and gives it the search role', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole('searchbox', { name: 'data_curation_search_label' })).toBeInTheDocument();
  });

  it('wraps the filters in a search landmark named for what it filters', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole('search', { name: 'data_curation_filters_label' })).toBeInTheDocument();
  });

  it('names the surveyor and community selects', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole('combobox', { name: 'field_surveyor' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'field_community' })).toBeInTheDocument();
  });

  it('names the status and completeness groups', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole('group', { name: 'data_curation_filter_status' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'data_curation_col_completeness' })).toBeInTheDocument();
  });

  it('hides the search glyph from assistive tech', () => {
    const { container } = render(<FilterBar {...defaultProps} />);
    const glyph = container.querySelector('svg');
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no axe violations', async () => {
    const { container } = render(<FilterBar {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations while loading', async () => {
    const { container } = render(<FilterBar {...defaultProps} loading />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
