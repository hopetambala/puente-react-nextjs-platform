import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

  it('highlights fields that differ between records', () => {
    render(<DuplicateResolver {...defaultProps} />);
    // communityname differs: 'Nsanje' vs 'Nsanje B'
    const highlighted = document.querySelectorAll('[data-differs="true"]');
    expect(highlighted.length).toBeGreaterThan(0);
  });

  it('renders Keep A, Keep B, and Both Unique action buttons', () => {
    render(<DuplicateResolver {...defaultProps} />);
    expect(screen.getByText(/keep a/i)).toBeInTheDocument();
    expect(screen.getByText(/keep b/i)).toBeInTheDocument();
    expect(screen.getByText(/both.*unique/i)).toBeInTheDocument();
  });
});

describe('DuplicateResolver — actions require confirmation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does NOT destroy immediately on Keep A — opens a confirm dialog first', () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText(/keep a/i));
    expect(mockDestroyB).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('destroys recordB and calls onResolved after confirming Keep A', async () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText(/keep a/i));
    fireEvent.click(screen.getByText(/delete record/i));
    await waitFor(() => expect(mockDestroyB).toHaveBeenCalled());
    expect(mockOnResolved).toHaveBeenCalled();
  });

  it('destroys recordA and calls onResolved after confirming Keep B', async () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText(/keep b/i));
    fireEvent.click(screen.getByText(/delete record/i));
    await waitFor(() => expect(mockDestroyA).toHaveBeenCalled());
    expect(mockOnResolved).toHaveBeenCalled();
  });

  it('calls onResolved() without any confirm or destroy when Both Unique clicked', () => {
    render(<DuplicateResolver {...defaultProps} />);
    fireEvent.click(screen.getByText(/both.*unique/i));
    expect(mockDestroyA).not.toHaveBeenCalled();
    expect(mockDestroyB).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockOnResolved).toHaveBeenCalled();
  });
});
