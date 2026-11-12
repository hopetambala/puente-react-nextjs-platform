import { useEffect, useRef } from 'react';

/**
 * Drive a native <dialog> as a modal from React state.
 *
 * The browser does the hard parts of a modal with `showModal()`: the dialog is
 * in the top layer, everything behind it is inert (no focus trap to maintain),
 * Esc closes it, and it carries the dialog role. This hook adds what the
 * platform leaves to us:
 *
 * - `open` → showModal() / close(), so React state stays the source of truth.
 * - Focus goes back to whatever opened the dialog when it closes (WCAG 2.4.3).
 * - Esc and a click on the backdrop are requests, not closes: they call
 *   `onClose`, and the dialog closes when the parent sets `open` to false. A
 *   parent may decline: a sheet with unsaved edits asks "Discard changes?"
 *   instead of vanishing with them. (A backdrop click is a click whose target
 *   is the <dialog> element itself, so the content must fill it: no padding on
 *   the <dialog>; pad an inner element.)
 * - A close the browser forces anyway (Chrome closes on a second Esc with no
 *   user activation between) is reported through `onClose` too, so the
 *   parent's state can't drift from the DOM. A close the parent caused by
 *   setting `open` to false does not call `onClose` again: callers that toggle
 *   (`() => setOpen(!open)`) would otherwise reopen it.
 *
 * Shared by the AppShell nav drawer, Dialog and Sheet.
 *
 * @param {boolean} open
 * @param {() => void} onClose  May be an inline function: it is read through a
 *   ref, so the listeners are bound once. (Re-binding them on every render
 *   removed the close listener in the same commit that closed the dialog, so
 *   focus never went back to the trigger.)
 * @returns {import('react').RefObject<HTMLDialogElement>}
 */
export default function useModalDialog(open, onClose) {
  const ref = useRef(null);
  const returnFocusTo = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusTo.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;

    const handleClose = () => {
      const trigger = returnFocusTo.current;
      returnFocusTo.current = null;
      if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
        trigger.focus();
      }
      if (openRef.current) onCloseRef.current();
    };
    const handleCancel = (event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const handleBackdropClick = (event) => {
      if (event.target === dialog) onCloseRef.current();
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, []);

  return ref;
}
