import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Echoes the key, with interpolation vars appended when present — the A/B
// labels are values inside a sentence, not fragments glued to one.
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars
      ? `${k}(${Object.entries(vars).map(([n, v]) => `${n}=${v}`).join(',')})`
      : k),
  }),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Modal: ({ open, text, action, actionText }) => (open ? (
    <div role="dialog">
      <p>{text}</p>
      <button type="button" onClick={action}>{actionText}</button>
    </div>
  ) : null),
}));

const mockDestroyA = jest.fn().mockResolvedValue({});
const mockDestroyB = jest.fn().mockResolvedValue({});
const mockOnResolved = jest.fn();

function makeRecord(id, data) {
  return { id, get: (k) => data[k], destroy: id === 'A' ? mockDestroyA : mockDestroyB };
}

const recordA = makeRecord('A', { fname: 'Hope', lname: 'Tambala', communityname: 'Nsanje', householdId: 'HH01', surveyingUser: 'alice', createdAt: new Date('2026-06-01') });
const recordB = makeRecord('B', { fname: 'Hope', lname: 'Tambala', communityname: 'Nsanje B', householdId: 'HH01', surveyingUser: 'alice', createdAt: new Date('2026-06-01') });

const DuplicateResolver = require('app/epics/DataCurationManager/DuplicateResolver').default;

const defaultProps = { recordA, recordB, source: 'survey-data', onResolved: mockOnResolved };

describe('DuplicateResolver — rendering', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders two record cards', () => {
    render(<DuplicateResolver {...defaultProps} />);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
  });

  it('routes the card headings and compared field labels through t()', () => {
    render(<DuplicateResolver {...defaultProps} />);
    expect(screen.getByText('data_curation_dup_record(label=A)')).toBeInTheDocument();
    expect(screen.getByText('data_curation_dup_record(label=B)')).toBeInTheDocument();
    // Reused from the inspector rather than minted again: the same column
    // means the same thing on both surfaces, and one word per concept is what
    // keeps a coordinator from re-learning the product per screen.
    expect(screen.getAllByText('field_fname')).toHaveLength(2);
    expect(screen.getAllByText('field_submitted')).toHaveLength(2);
  });

  it('routes the delete confirmation through t()', () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText('data_curation_dup_keep(keep=A,dismiss=B)'));
    expect(screen.getByText('data_curation_dup_delete_confirm')).toBeInTheDocument();
  });

  it('highlights fields that differ between records', () => {
    render(<DuplicateResolver {...defaultProps} />);
    // communityname differs: 'Nsanje' vs 'Nsanje B'
    const highlighted = document.querySelectorAll('[data-differs="true"]');
    expect(highlighted.length).toBeGreaterThan(0);
  });

  it('renders Keep A, Keep B, and Both Unique action buttons', () => {
    render(<DuplicateResolver {...defaultProps} />);
    expect(screen.getByText('data_curation_dup_keep(keep=A,dismiss=B)')).toBeInTheDocument();
    expect(screen.getByText('data_curation_dup_keep(keep=B,dismiss=A)')).toBeInTheDocument();
    expect(screen.getByText('data_curation_dup_both_unique')).toBeInTheDocument();
  });
});

describe('DuplicateResolver — actions require confirmation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does NOT destroy immediately on Keep A — opens a confirm dialog first', () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText('data_curation_dup_keep(keep=A,dismiss=B)'));
    expect(mockDestroyB).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('destroys recordB and calls onResolved after confirming Keep A', async () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText('data_curation_dup_keep(keep=A,dismiss=B)'));
    fireEvent.click(screen.getByText('data_curation_dup_delete_action'));
    await waitFor(() => expect(mockDestroyB).toHaveBeenCalled());
    expect(mockOnResolved).toHaveBeenCalled();
  });

  it('destroys recordA and calls onResolved after confirming Keep B', async () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText('data_curation_dup_keep(keep=B,dismiss=A)'));
    fireEvent.click(screen.getByText('data_curation_dup_delete_action'));
    await waitFor(() => expect(mockDestroyA).toHaveBeenCalled());
    expect(mockOnResolved).toHaveBeenCalled();
  });

  it('calls onResolved() without any confirm or destroy when Both Unique clicked', () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText('data_curation_dup_both_unique'));
    expect(mockDestroyA).not.toHaveBeenCalled();
    expect(mockDestroyB).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockOnResolved).toHaveBeenCalled();
  });
});
