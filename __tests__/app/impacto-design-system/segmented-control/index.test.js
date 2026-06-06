import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const SegmentedControl = require('app/impacto-design-system/segmented-control').default;

// ─── RED: onChange handler ─────────────────────────────────────────────────────
// If the onClick on each button is removed, the interaction test fails before
// a user reports that clicking a view toggle does nothing.

const OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'cards', label: 'Cards' },
  { value: 'map', label: 'Map' },
];

describe('Rendering', () => {
  it('renders a button for each option', () => {
    render(<SegmentedControl options={OPTIONS} value="table" onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('displays each option label', () => {
    render(<SegmentedControl options={OPTIONS} value="table" onChange={() => {}} />);
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('Map')).toBeInTheDocument();
  });
});

describe('Active state', () => {
  it('marks the button matching value with an active class', () => {
    render(<SegmentedControl options={OPTIONS} value="cards" onChange={() => {}} />);
    const cardsBtn = screen.getByText('Cards').closest('button');
    expect(cardsBtn.className).toMatch('active');
  });

  it('does not mark non-active buttons', () => {
    render(<SegmentedControl options={OPTIONS} value="cards" onChange={() => {}} />);
    const tableBtn = screen.getByText('Table').closest('button');
    expect(tableBtn.className).not.toMatch('active');
  });
});

describe('Interaction', () => {
  it('calls onChange with the clicked option value', async () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={OPTIONS} value="table" onChange={onChange} />);
    await userEvent.click(screen.getByText('Cards'));
    expect(onChange).toHaveBeenCalledWith('cards');
  });

  it('calls onChange even when clicking the active option', async () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={OPTIONS} value="table" onChange={onChange} />);
    await userEvent.click(screen.getByText('Table'));
    expect(onChange).toHaveBeenCalledWith('table');
  });

  it('does not throw when onChange is not provided and a button is clicked', async () => {
    // Suppress the expected React error boundary console.error noise
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<SegmentedControl options={OPTIONS} value="table" />);

    let caughtError = null;
    try {
      await userEvent.click(screen.getByText('Cards'));
    } catch (err) {
      caughtError = err;
    }

    spy.mockRestore();

    expect(caughtError).toBeNull();
  });
});
