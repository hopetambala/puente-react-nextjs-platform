import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import { axe } from '../../../../__test-utils__/axe';

// Card, CardAlt and Table structure (docs/responsive-a11y-overhaul.md, PR 3).
// Table's stacked layout is a container query: a real browser checks it in the
// e2e sweep. Here: the semantics every layout keeps.

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const Card = require('app/impacto-design-system/card').default;
const CardAlt = require('app/impacto-design-system/card-alt').default;
const Table = require('app/impacto-design-system/table').default;

describe('Card', () => {
  it('is a container, not a control', () => {
    render(<Card title="Forms"><p>Body</p></Card>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('titles itself at the heading level it is given', () => {
    render(<Card title="Forms" headingLevel={2}><p>Body</p></Card>);
    expect(screen.getByRole('heading', { level: 2, name: 'Forms' })).toBeInTheDocument();
  });
});

describe('CardAlt', () => {
  it('is an article with a heading, and its actions are not inside a link', () => {
    render(<CardAlt title="WASH survey" description="Water and sanitation" actions={[{ text: 'Duplicate', action: () => {} }]} />);
    const article = screen.getByRole('article');
    expect(within(article).getByRole('heading', { level: 3, name: 'WASH survey' })).toBeInTheDocument();
    const action = within(article).getByRole('button', { name: 'Duplicate' });
    expect(action.closest('a')).toBeNull();
    expect(within(article).queryByRole('link')).not.toBeInTheDocument();
  });

  it('links only the title, when there is somewhere to go', () => {
    render(<CardAlt title="WASH survey" nextLink="/forms/1" />);
    expect(screen.getByRole('link', { name: 'WASH survey' })).toHaveAttribute('href', '/forms/1');
  });

  it('has no axe violations', async () => {
    const { container } = render(<CardAlt title="WASH survey" nextLink="/forms/1" actions={[{ text: 'Duplicate', action: () => {} }]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Table', () => {
  const columns = [
    { accessorKey: 'org', header: 'Organization' },
    { accessorKey: 'answer', header: () => <span>Answer</span>, meta: { label: 'Answer' } },
  ];
  const data = [{ org: 'Puente', answer: 'Water' }, { org: 'Cevicos', answer: 'Well' }];

  it('is a table named by its caption, in a focusable scroll region with the same name', () => {
    render(<Table caption="Answers collected" columns={columns} data={data} />);
    expect(screen.getByRole('table', { name: 'Answers collected' })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Answers collected' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('scopes headers to columns and keeps cells plain (no fake buttons)', () => {
    render(<Table caption="Answers collected" columns={columns} data={data} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Organization' })).toHaveAttribute('scope', 'col');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('labels each cell with its column for the stacked layout', () => {
    render(<Table caption="Answers collected" columns={columns} data={data} />);
    expect(screen.getByRole('cell', { name: 'Water' })).toHaveAttribute('data-label', 'Answer');
    expect(screen.getByRole('cell', { name: 'Puente' })).toHaveAttribute('data-label', 'Organization');
  });

  it('says so when there are no rows', () => {
    render(<Table caption="Answers collected" columns={columns} data={[]} />);
    expect(screen.getByText('table_empty')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<Table caption="Answers collected" columns={columns} data={data} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('SegmentedControl', () => {
  const SegmentedControl = require('app/impacto-design-system/segmented-control').default;
  const options = [{ label: 'Records', value: 'records' }, { label: 'Community audit', value: 'audit' }];

  it('says which option is pressed, not by colour alone (WCAG 4.1.2)', () => {
    render(<SegmentedControl label="View" options={options} value="audit" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Community audit' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Records' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('has no axe violations', async () => {
    const { container } = render(<SegmentedControl label="View" options={options} value="records" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Panel', () => {
  const Panel = require('app/impacto-design-system/panel').default;

  it('is a section whose title is a real heading (level 2 by default)', () => {
    render(<Panel title="Registry"><p>Body</p></Panel>);
    expect(screen.getByRole('heading', { level: 2, name: 'Registry' })).toBeInTheDocument();
  });

  it('takes another heading level when nested', () => {
    render(<Panel title="Registry" headingLevel={3}><p>Body</p></Panel>);
    expect(screen.getByRole('heading', { level: 3, name: 'Registry' })).toBeInTheDocument();
  });
});
