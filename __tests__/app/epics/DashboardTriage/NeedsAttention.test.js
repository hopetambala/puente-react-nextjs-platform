import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }),
}));

// eslint-disable-next-line import/first
import NeedsAttention from 'app/epics/DashboardTriage/NeedsAttention';

// Mirrors what buildTriageQueue actually emits, `denominator` included —
// missing-key-fields is an exact count over every record, so it is one of the
// two signals whose numerator may be read against the org record total.
const row = (over = {}) => ({
  id: 'missing-key-fields',
  labelKey: 'triage_missing_key_fields',
  count: 12,
  severity: 'medium',
  approximate: false,
  denominator: 'org-records',
  href: '/data/data-curation',
  ...over,
});

describe('NeedsAttention', () => {
  it('renders one link per row so every item is actionable and keyboard reachable', () => {
    render(<NeedsAttention rows={[row(), row({ id: 'form-drift', labelKey: 'triage_form_drift', count: 1, severity: 'critical', approximate: true })]} loading={false} />);

    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('shows the count for a row', () => {
    render(<NeedsAttention rows={[row({ count: 12 })]} total={43979} loading={false} />);

    // The count is now rendered inside its quantity phrase ("12 of 43,979")
    // rather than as a bare numerator, so assert it via the interpolation.
    expect(screen.getByTestId('triage-row-missing-key-fields'))
      .toHaveTextContent(/"count":12/);
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

  it('still discloses the failed check while showing the no-records state', () => {
    render(<NeedsAttention rows={[]} recordState="none" unavailable={['form-drift']} loading={false} />);

    expect(screen.getByTestId('triage-no-records')).toBeInTheDocument();
    expect(screen.getByTestId('triage-unavailable-note'))
      .toHaveTextContent(/triage_unavailable_form-drift/);
  });
});

describe('NeedsAttention denominators', () => {
  it('states the denominator alongside the count so the magnitude can be judged', () => {
    render(<NeedsAttention rows={[row({ count: 12 })]} total={43979} loading={false} />);

    expect(screen.getByTestId('triage-row-missing-key-fields'))
      .toHaveTextContent(/triage_count_of_total:\{"count":12,"total":43979\}/);
  });

  it('says the total is unknown rather than implying a base rate when the total failed to load', () => {
    render(<NeedsAttention rows={[row({ count: 12 })]} total={null} loading={false} />);

    const el = screen.getByTestId('triage-row-missing-key-fields');
    expect(el).toHaveTextContent(/triage_count_of_unknown/);
    expect(el).not.toHaveTextContent(/triage_count_of_total/);
  });

  // A wrong base rate is worse than a missing one: it reads as measured. Form
  // drift counts FORM DEFINITIONS, so pinning it to the record total compares
  // forms to records and makes the one critical signal look vanishingly rare.
  it('never reads a form count against the record total', () => {
    render(<NeedsAttention
      rows={[row({
        id: 'form-drift',
        labelKey: 'triage_form_drift',
        count: 1,
        severity: 'critical',
        approximate: true,
        denominator: null,
      })]}
      total={43979}
      loading={false}
    />);

    const el = screen.getByTestId('triage-row-form-drift');
    expect(el).not.toHaveTextContent(/triage_count_of_total/);
    expect(el).not.toHaveTextContent(/43979/);
    // The count still renders — through the locale's number format, not raw.
    expect(el).toHaveTextContent(/number_value:\{"value":1\}/);
  });

  // Duplicates are reduced from the capped sample, so their base is the sampled
  // rows and not the org total — quoting 43,979 understates the rate ~44x.
  it('never reads a sampled count against the record total', () => {
    render(<NeedsAttention
      rows={[row({
        id: 'possible-duplicates',
        labelKey: 'triage_possible_duplicates',
        count: 3,
        approximate: true,
        denominator: null,
      })]}
      total={43979}
      loading={false}
    />);

    const el = screen.getByTestId('triage-row-possible-duplicates');
    expect(el).not.toHaveTextContent(/triage_count_of_total/);
    expect(el).not.toHaveTextContent(/43979/);
    // The sampling is still disclosed — suppressing the base rate must not
    // quietly upgrade an estimate into an exact figure.
    expect(el).toHaveTextContent(/triage_estimated/);
  });
});
