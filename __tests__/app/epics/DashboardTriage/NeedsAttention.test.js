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

describe('when a check could not run', () => {
  it('withholds the all-clear, because it might be wrong', () => {
    render(<NeedsAttention rows={[]} unavailable={['form-drift']} loading={false} />);

    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
    expect(screen.getByTestId('triage-partial')).toBeInTheDocument();
  });

  it('names which check could not run', () => {
    render(<NeedsAttention rows={[]} unavailable={['form-drift']} loading={false} />);

    expect(screen.getByTestId('triage-partial')).toHaveTextContent(/triage_unavailable_form-drift/);
  });

  it('still shows the all-clear when every check ran', () => {
    render(<NeedsAttention rows={[]} unavailable={[]} loading={false} />);

    expect(screen.getByTestId('triage-clear')).toBeInTheDocument();
  });

  it('notes the failed check alongside real rows too', () => {
    render(<NeedsAttention rows={[row()]} unavailable={['possible-duplicates']} loading={false} />);

    expect(screen.getByTestId('triage-row-missing-key-fields')).toBeInTheDocument();
    expect(screen.getByTestId('triage-unavailable-note')).toBeInTheDocument();
  });
});

describe('when the organization has no records yet', () => {
  it('tells a first-time organization records arrive by mobile sync, instead of an all-clear', () => {
    render(<NeedsAttention rows={[]} recordState="none" loading={false} />);

    expect(screen.getByTestId('triage-no-records')).toBeInTheDocument();
    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
    expect(screen.getByText('triage_no_records')).toBeInTheDocument();
    expect(screen.getByText('triage_no_records_sub')).toBeInTheDocument();
  });

  it('withholds both the all-clear and the no-records claim when it cannot tell which is true', () => {
    render(<NeedsAttention rows={[]} recordState="unknown" unavailable={[]} loading={false} />);

    expect(screen.getByTestId('triage-partial')).toBeInTheDocument();
    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triage-no-records')).not.toBeInTheDocument();
  });
});
