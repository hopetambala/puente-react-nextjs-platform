import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── RED: Card → RadioGroup replacement (audit F-11) ─────────────────────────
// If the <Card onClick> dimension selector is ever restored, the radio-group
// testid and option testids disappear — caught before users lose the dimension
// selector in Quick Insights.

// ─── RED: PageHeader adoption (audit F-02) ────────────────────────────────────
// If PageHeader is replaced with a raw <h1>, the page-header testid disappears —
// catches the heading pattern regression before deploy.

const mockRetrieve = jest.fn().mockResolvedValue([]);

jest.mock('app/modules/django-etl', () => ({
  environmentalHealthRecord: {
    retrieve: (...args) => mockRetrieve(...args),
  },
}));

jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children, breadcrumb }) => (
    <div data-testid="appshell" data-breadcrumb={JSON.stringify(breadcrumb)}>{children}</div>
  ),
  PageHeader: ({ title, eyebrow, sub }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {eyebrow && <span>{eyebrow}</span>}
      {sub && <p>{sub}</p>}
    </div>
  ),
  Panel: ({ title, action, children }) => (
    <div data-testid={`panel-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="panelTitle">{title}</span>
      {action && <span data-testid="panel-action">{action}</span>}
      <div>{children}</div>
    </div>
  ),
  RadioGroup: jest.fn(({ options, value, onChange }) => (
    <div data-testid="radio-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-testid={`option-${opt.value}`}
          data-active={String(opt.value === value)}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {opt.subLabel && <span>{opt.subLabel}</span>}
        </button>
      ))}
    </div>
  )),
  SegmentedControl: ({ options, value, onChange }) => (
    <div data-testid="chart-type-control">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-active={String(opt.value === value)}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
  EmptyState: ({ message }) => <p data-testid="empty-state">{message}</p>,
}));

jest.mock('app/impacto-design-system/visualizations', () => ({
  BarChart: ({ groupMode }) => <div data-testid="bar-chart" data-group-mode={groupMode} />,
}));

const QuickInsights = require('pages/data/data-visualization/index').default;

beforeEach(() => {
  mockRetrieve.mockClear();
  mockRetrieve.mockResolvedValue([]);
});

describe('Shell', () => {
  it('renders AppShell with Data / Quick Insights breadcrumb', () => {
    render(<QuickInsights />);
    const shell = screen.getByTestId('appshell');
    expect(JSON.parse(shell.dataset.breadcrumb)).toEqual(['Data', 'Quick Insights']);
  });
});

describe('PageHeader', () => {
  it('renders via PageHeader component (not a raw h1)', () => {
    render(<QuickInsights />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('displays "Quick Insights" as the title', () => {
    render(<QuickInsights />);
    expect(screen.getByRole('heading', { name: 'Quick Insights' })).toBeInTheDocument();
  });
});

describe('Dimension selector', () => {
  it('renders a RadioGroup (not Card buttons) for the dimensions', () => {
    render(<QuickInsights />);
    expect(screen.getByTestId('radio-group')).toBeInTheDocument();
  });

  it('includes all 4 dimension options', () => {
    render(<QuickInsights />);
    expect(screen.getByText('Type of water you drink')).toBeInTheDocument();
    expect(screen.getByText('Years in Community')).toBeInTheDocument();
    expect(screen.getByText('Clinic Access')).toBeInTheDocument();
    expect(screen.getByText('Floor Material')).toBeInTheDocument();
  });

  it('shows formikKey as subLabel for each option', () => {
    render(<QuickInsights />);
    expect(screen.getByText('typeofwaterdoyoudrink')).toBeInTheDocument();
    expect(screen.getByText('yearslivedinthecommunity')).toBeInTheDocument();
  });

  it('marks no option active on initial render', () => {
    render(<QuickInsights />);
    const radioGroup = screen.getByTestId('radio-group');
    within(radioGroup).getAllByRole('button').forEach((btn) => {
      expect(btn.dataset.active).toBe('false');
    });
  });

  it('marks the selected option active after click', async () => {
    render(<QuickInsights />);
    await userEvent.click(screen.getByTestId('option-typeofwaterdoyoudrink'));
    expect(screen.getByTestId('option-typeofwaterdoyoudrink').dataset.active).toBe('true');
  });
});

describe('Data fetch', () => {
  it('does not call retrieve on mount (no dimension selected)', () => {
    render(<QuickInsights />);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('calls retrieve with the selected formikKey after a dimension is clicked', async () => {
    render(<QuickInsights />);
    await userEvent.click(screen.getByTestId('option-clinicaccess_v2'));
    await waitFor(() => {
      expect(mockRetrieve).toHaveBeenCalledWith(
        'environmentalhealthbronze/get_count/',
        JSON.stringify({ fields: ['clinicaccess_v2'] }),
      );
    });
  });
});

describe('Chart', () => {
  it('does not render BarChart when no dimension is selected', () => {
    render(<QuickInsights />);
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders BarChart after a dimension is selected and data loads', async () => {
    mockRetrieve.mockResolvedValueOnce([{ typeofwaterdoyoudrink: 'Well', count: 10 }]);
    render(<QuickInsights />);
    await userEvent.click(screen.getByTestId('option-typeofwaterdoyoudrink'));
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});

// ─── RED: Panel layout + SegmentedControl + EmptyState ───────────────────────
// If the dimension rail or chart panel is removed, or the chart type toggle
// disappears, these tests catch it before users see a broken Quick Insights.

describe('Panel layout', () => {
  it('renders a Dimensions panel wrapping the radio group', () => {
    render(<QuickInsights />);
    expect(screen.getByTestId('panel-dimensions')).toBeInTheDocument();
  });

  it('renders a Chart panel for the chart area', () => {
    render(<QuickInsights />);
    expect(screen.getByTestId('panel-chart')).toBeInTheDocument();
  });
});

describe('Chart type control', () => {
  it('renders a SegmentedControl with at least a Bar option', () => {
    render(<QuickInsights />);
    expect(screen.getByTestId('chart-type-control')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bar' })).toBeInTheDocument();
  });
});

describe('Empty state', () => {
  it('shows an empty state prompt when no dimension is selected', () => {
    render(<QuickInsights />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('hides the empty state once a dimension is selected and data loads', async () => {
    mockRetrieve.mockResolvedValueOnce([{ typeofwaterdoyoudrink: 'Well', count: 10 }]);
    render(<QuickInsights />);
    await userEvent.click(screen.getByTestId('option-typeofwaterdoyoudrink'));
    await waitFor(() => expect(screen.getByTestId('bar-chart')).toBeInTheDocument());
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});

// ─── RED: chart type not wired to BarChart ────────────────────────────────────
// If the chartType state is never passed to BarChart as groupMode, the
// SegmentedControl toggle is a no-op — caught before users see a chart that
// never changes when they click Stacked or Bar.

describe('Chart type switching', () => {
  async function renderWithData() {
    mockRetrieve.mockResolvedValueOnce([{ typeofwaterdoyoudrink: 'Well', count: 10 }]);
    render(<QuickInsights />);
    await userEvent.click(screen.getByTestId('option-typeofwaterdoyoudrink'));
    await waitFor(() => expect(screen.getByTestId('bar-chart')).toBeInTheDocument());
  }

  it('defaults to "grouped" groupMode (Bar selected)', async () => {
    await renderWithData();
    expect(screen.getByTestId('bar-chart').dataset.groupMode).toBe('grouped');
  });

  it('switches to "stacked" groupMode when Stacked is selected', async () => {
    await renderWithData();
    await userEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    expect(screen.getByTestId('bar-chart').dataset.groupMode).toBe('stacked');
  });

  it('returns to "grouped" groupMode when Bar is re-selected', async () => {
    await renderWithData();
    await userEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bar' }));
    expect(screen.getByTestId('bar-chart').dataset.groupMode).toBe('grouped');
  });
});
