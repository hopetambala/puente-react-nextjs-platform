import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { axe } from '../../../../__test-utils__/axe';

// Sheet: secondary work over the page (record details, inspector, preview).
// Side panel from lg up, bottom sheet below: that switch is CSS and is checked
// in a real browser by the e2e sweep. Here: dialog behaviour and structure.

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const Sheet = require('app/impacto-design-system/sheet').default;

function Harness({ footer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open record</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Record details" footer={footer}>
        <label htmlFor="name">Name</label>
        <input id="name" />
      </Sheet>
    </>
  );
}

const dialog = () => document.querySelector('dialog');
const open = () => userEvent.click(screen.getByRole('button', { name: 'Open record' }));

describe('Sheet', () => {
  it('opens as a modal dialog named and headed by its title', async () => {
    render(<Harness />);
    await open();
    expect(dialog().open).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Record details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Record details' })).toBeInTheDocument();
  });

  it('only renders its content while open', async () => {
    render(<Harness />);
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    await open();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('closes from its close button and returns focus to the opener', async () => {
    render(<Harness />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'action_close' }));
    expect(dialog().open).toBe(false);
    expect(screen.getByRole('button', { name: 'Open record' })).toHaveFocus();
  });

  it('closes when the browser closes it (Esc) and on a backdrop click', async () => {
    render(<Harness />);
    await open();
    dialog().close();
    expect(dialog().open).toBe(false);
    await open();
    await userEvent.click(dialog());
    expect(dialog().open).toBe(false);
  });

  it('renders a pinned footer for its actions', async () => {
    render(<Harness footer={<button type="button">Save</button>} />);
    await open();
    expect(screen.getByRole('contentinfo')).toContainElement(screen.getByRole('button', { name: 'Save' }));
  });

  it('has no axe violations while open', async () => {
    const { container } = render(<Harness footer={<button type="button">Save</button>} />);
    await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
