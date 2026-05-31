import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const RadioGroup = require('app/impacto-design-system/form-controls/radio-group').default;

// ─── RED: onChange handler removal ───────────────────────────────────────────
// If onClick is removed from option buttons, the interaction test fails before
// a user reports that selecting a dimension in Quick Insights does nothing.

const OPTIONS = [
  { value: 'water_type', label: 'Water type', subLabel: 'waterType' },
  { value: 'floor_material', label: 'Floor material', subLabel: 'floorMaterial' },
  { value: 'clinic_access', label: 'Clinic access' },
];

describe('Rendering', () => {
  it('renders a button for each option', () => {
    render(<RadioGroup options={OPTIONS} value="water_type" onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renders each option label', () => {
    render(<RadioGroup options={OPTIONS} value="water_type" onChange={() => {}} />);
    expect(screen.getByText('Water type')).toBeInTheDocument();
    expect(screen.getByText('Floor material')).toBeInTheDocument();
    expect(screen.getByText('Clinic access')).toBeInTheDocument();
  });

  it('renders subLabel when provided', () => {
    render(<RadioGroup options={OPTIONS} value="water_type" onChange={() => {}} />);
    expect(screen.getByText('waterType')).toBeInTheDocument();
    expect(screen.getByText('floorMaterial')).toBeInTheDocument();
  });

  it('does not render subLabel text when absent', () => {
    render(<RadioGroup options={OPTIONS} value="water_type" onChange={() => {}} />);
    // clinic_access has no subLabel — its button should have no .subLabel span
    const clinicBtn = screen.getByText('Clinic access').closest('button');
    expect(clinicBtn.querySelector('.subLabel')).not.toBeInTheDocument();
  });
});

describe('Active state', () => {
  it('applies active class to the button matching value', () => {
    render(<RadioGroup options={OPTIONS} value="floor_material" onChange={() => {}} />);
    const btn = screen.getByText('Floor material').closest('button');
    expect(btn.className).toMatch('active');
  });

  it('does not apply active class to non-matching buttons', () => {
    render(<RadioGroup options={OPTIONS} value="floor_material" onChange={() => {}} />);
    const btn = screen.getByText('Water type').closest('button');
    expect(btn.className).not.toMatch('active');
  });
});

describe('Interaction', () => {
  it('calls onChange with the clicked option value', async () => {
    const onChange = jest.fn();
    render(<RadioGroup options={OPTIONS} value="water_type" onChange={onChange} />);
    await userEvent.click(screen.getByText('Floor material'));
    expect(onChange).toHaveBeenCalledWith('floor_material');
  });
});
