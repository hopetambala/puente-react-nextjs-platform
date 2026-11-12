import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// The confirmation dialog in FormManager, data curation's duplicate resolver,
// community audit and record inspector. It is a native <dialog> driven by
// dialog/useModalDialog.js (jsdom's missing showModal is polyfilled in
// jest.setup.js). Esc and the inert background are the browser's job and are
// covered by the e2e sweep.

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const Modal = require('app/impacto-design-system/modal').default;

const defaultProps = {
  text: 'Do you want to remove this form?',
  actionText: 'Delete form',
  action: jest.fn(),
  handleClose: jest.fn(),
  intent: 'danger',
};

const dialog = () => document.querySelector('dialog');

beforeEach(() => jest.clearAllMocks());

describe('Visibility', () => {
  it('opens as a modal dialog named by its question', () => {
    render(<Modal {...defaultProps} open />);
    expect(dialog().open).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Do you want to remove this form?' })).toBeInTheDocument();
  });

  it('stays closed when open is false', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(dialog().open).toBe(false);
  });

  it('closes when open turns false, without reporting a close of its own', () => {
    const handleClose = jest.fn();
    const { rerender } = render(<Modal {...defaultProps} open handleClose={handleClose} />);
    rerender(<Modal {...defaultProps} open={false} handleClose={handleClose} />);
    expect(dialog().open).toBe(false);
    // A caller that toggles (`setOpen(!open)`) would reopen it otherwise.
    expect(handleClose).not.toHaveBeenCalled();
  });
});

describe('Action button', () => {
  it('renders the actionText as the confirmation button label', () => {
    render(<Modal {...defaultProps} open />);
    expect(screen.getByRole('button', { name: 'Delete form' })).toBeInTheDocument();
  });

  it('calls action when the confirmation button is clicked', async () => {
    const action = jest.fn();
    render(<Modal {...defaultProps} open action={action} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete form' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('Ways out', () => {
  it('offers a Cancel button that closes it', async () => {
    const handleClose = jest.fn();
    render(<Modal {...defaultProps} open handleClose={handleClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'action_cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('reports a close the browser started (Esc) through handleClose', () => {
    const handleClose = jest.fn();
    render(<Modal {...defaultProps} open handleClose={handleClose} />);
    dialog().close();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click', async () => {
    const handleClose = jest.fn();
    render(<Modal {...defaultProps} open handleClose={handleClose} />);
    await userEvent.click(dialog());
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the control that opened it', async () => {
    function Harness() {
      const React = require('react');
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Delete</button>
          <Modal {...defaultProps} open={open} handleClose={() => setOpen(false)} />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await userEvent.click(trigger);
    dialog().close();
    expect(trigger).toHaveFocus();
  });
});

describe('Accessibility', () => {
  it('has no axe violations while open', async () => {
    const { container } = render(<Modal {...defaultProps} open />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
