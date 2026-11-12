import '@testing-library/jest-dom';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import { useState } from 'react';

import useModalDialog from 'app/impacto-design-system/dialog/useModalDialog';

// React state is the source of truth for whether a dialog is open. Esc and a
// backdrop click are requests: they report through onClose and the dialog
// closes when the parent sets open to false. A parent may decline, which is
// how a sheet with unsaved edits asks "Discard changes?" instead of vanishing
// with them.

function Harness({ allowClose = true, onRequest = () => {} }) {
  const [open, setOpen] = useState(true);
  const ref = useModalDialog(open, () => {
    onRequest();
    if (allowClose) setOpen(false);
  });
  return (
    <dialog ref={ref} aria-label="Test dialog">
      <p>Body</p>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
    </dialog>
  );
}

const dialog = () => document.querySelector('dialog');
const pressEsc = () => {
  const event = new Event('cancel', { cancelable: true });
  act(() => { dialog().dispatchEvent(event); });
  return event;
};

describe('useModalDialog — browser closes are requests', () => {
  it('reports Esc through onClose and closes once the parent agrees', () => {
    const onRequest = jest.fn();
    render(<Harness onRequest={onRequest} />);
    pressEsc();
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(false);
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('keeps the dialog open on Esc when the parent declines', () => {
    const onRequest = jest.fn();
    render(<Harness allowClose={false} onRequest={onRequest} />);
    const event = pressEsc();
    expect(event.defaultPrevented).toBe(true);
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(true);
  });

  it('keeps the dialog open on a backdrop click when the parent declines', () => {
    const onRequest = jest.fn();
    render(<Harness allowClose={false} onRequest={onRequest} />);
    fireEvent.click(dialog());
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(true);
  });

  it('closes on a backdrop click when the parent agrees', () => {
    render(<Harness />);
    fireEvent.click(dialog());
    expect(dialog().open).toBe(false);
  });

  it('ignores clicks inside the content', () => {
    const onRequest = jest.fn();
    render(<Harness onRequest={onRequest} />);
    fireEvent.click(screen.getByText('Body'));
    expect(onRequest).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);
  });

  // A browser may still force a close (Chrome closes on a second Esc with no
  // user activation in between). That close is reported like any other.
  it('reports a close the browser forces', () => {
    const onRequest = jest.fn();
    render(<Harness onRequest={onRequest} />);
    act(() => dialog().close());
    expect(onRequest).toHaveBeenCalledTimes(1);
  });
});
