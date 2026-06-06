import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('app/impacto-design-system', () => ({
  Panel: ({ title, children }) => <div><h3>{title}</h3>{children}</div>,
  Button: ({ text, onClick, isDisabled }) => (
    <button type="button" onClick={onClick} disabled={isDisabled}>{text}</button>
  ),
  Modal: ({ open, text, action, actionText }) => (open ? (
    <div role="dialog">
      <p>{text}</p>
      <button type="button" onClick={action}>{actionText}</button>
    </div>
  ) : null),
}));

const mockFind = jest.fn().mockResolvedValue([]);
const mockSave = jest.fn().mockResolvedValue({});

// Helper: build mock records whose communityname comes from the given list
function recordsFromNames(names) {
  return names.map((n) => ({ get: (k) => (k === 'communityname' ? n : undefined), set: jest.fn(), save: mockSave }));
}

jest.mock('parse', () => ({
  Parse: {
    Query: jest.fn(() => ({
      equalTo: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      find: mockFind,
    })),
    Object: { extend: jest.fn(() => ({})) },
  },
}));

jest.mock('app/services/parse', () => ({ initialize: jest.fn() }));

const { levenshtein } = require('app/epics/DataCurationManager/CommunityAudit');
const CommunityAudit = require('app/epics/DataCurationManager/CommunityAudit').default;

describe('levenshtein (pure function)', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('Sabana Yegua', 'Sabana Yegua')).toBe(0);
  });

  it('returns ≤ 2 for "Sabana Yegua" vs "Sabana Yégua"', () => {
    expect(levenshtein('Sabana Yegua', 'Sabana Yégua')).toBeLessThanOrEqual(2);
  });

  it('returns > 2 for clearly different names', () => {
    expect(levenshtein('Nsanje', 'Blantyre')).toBeGreaterThan(2);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('CommunityAudit — grouping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Community Audit panel', async () => {
    mockFind.mockResolvedValue([]);
    render(<CommunityAudit org="TestOrg" />);
    await waitFor(() => expect(screen.getByText('Community Audit')).toBeInTheDocument());
  });

  it('shows grouped misspellings when similar names exist', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua', 'Nsanje']));
    render(<CommunityAudit org="TestOrg" />);
    await waitFor(() => {
      expect(screen.getByText('Sabana Yegua')).toBeInTheDocument();
      expect(screen.getByText('Sabana Yégua')).toBeInTheDocument();
    });
  });

  it('does not group names with distance > 2', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Nsanje', 'Blantyre']));
    render(<CommunityAudit org="TestOrg" />);
    await waitFor(() => screen.getByText('Community Audit'));
    // Neither should be shown as a duplicate group
    expect(screen.queryByText(/apply/i)).not.toBeInTheDocument();
  });
});

describe('CommunityAudit — apply canonical name', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders an Apply button when a group exists', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
    render(<CommunityAudit org="TestOrg" />);
    await waitFor(() => expect(screen.getByText(/apply/i)).toBeInTheDocument());
  });

  it('opens a confirm dialog on Apply and does NOT save until confirmed', async () => {
    mockFind.mockResolvedValue(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']));
    render(<CommunityAudit org="TestOrg" />);
    await waitFor(() => screen.getByText(/apply/i));
    fireEvent.click(screen.getByText(/apply/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves renamed records after confirming', async () => {
    // First find() loads the distinct names; subsequent find() calls return the
    // variant records to be renamed.
    mockFind
      .mockResolvedValueOnce(recordsFromNames(['Sabana Yegua', 'Sabana Yégua']))
      .mockResolvedValue(recordsFromNames(['Sabana Yégua']));
    render(<CommunityAudit org="TestOrg" />);
    await waitFor(() => screen.getByText(/apply/i));
    fireEvent.click(screen.getByText(/apply/i));
    fireEvent.click(screen.getByText('Rename records'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
  });
});
