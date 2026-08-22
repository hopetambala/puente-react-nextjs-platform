import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }),
}));

// eslint-disable-next-line import/first
import NeedsAttention from 'app/epics/DashboardTriage/NeedsAttention';

const row = (over = {}) => ({
  id: 'missing-key-fields',
  labelKey: 'triage_missing_key_fields',
  count: 12,
  severity: 'medium',
  approximate: false,
  href: '/data/data-curation',
  ...over,
});

describe('NeedsAttention', () => {
  it('renders one link per row so every item is actionable and keyboard reachable', () => {
    render(<NeedsAttention rows={[row(), row({ id: 'form-drift', labelKey: 'triage_form_drift', count: 1, severity: 'critical', approximate: true })]} loading={false} />);

    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('shows the count for a row', () => {
    render(<NeedsAttention rows={[row({ count: 12 })]} loading={false} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('uses the plain label for an exact count', () => {
    render(<NeedsAttention rows={[row()]} loading={false} />);

    expect(screen.getByTestId('triage-row-missing-key-fields'))
      .toHaveTextContent(/triage_missing_key_fields(?!_approx)/);
  });

  it('hedges the label for an approximate count', () => {
    render(<NeedsAttention rows={[row({ id: 'form-drift', labelKey: 'triage_form_drift', approximate: true })]} loading={false} />);

    expect(screen.getByTestId('triage-row-form-drift'))
      .toHaveTextContent(/triage_form_drift_approx/);
  });

  it('marks an approximate row as estimated in text, not by colour alone', () => {
    render(<NeedsAttention rows={[row({ approximate: true })]} loading={false} />);

    expect(screen.getByText(/triage_estimated/)).toBeInTheDocument();
  });

  it('conveys severity as text, not colour alone', () => {
    render(<NeedsAttention rows={[row({ severity: 'critical' })]} loading={false} />);

    expect(screen.getByTestId('triage-row-missing-key-fields'))
      .toHaveTextContent(/triage_severity_critical/);
  });

  it('treats an empty queue as a good outcome, not a void', () => {
    render(<NeedsAttention rows={[]} loading={false} />);

    expect(screen.getByTestId('triage-clear')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows placeholders while loading rather than a premature all-clear', () => {
    render(<NeedsAttention rows={[]} loading />);

    expect(screen.getByTestId('triage-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
  });
});
