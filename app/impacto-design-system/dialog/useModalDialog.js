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
 * - A click on the backdrop closes it. That is a click whose target is the
 *   <dialog> element itself, so the dialog's content must fill it (no padding
 *   on the <dialog>; pad an inner element).
 * - Every way of closing (Esc, backdrop, close(), unmount of the trigger)
 *   reports through `onClose`, so the parent's state can't drift from the DOM.
 *
 * Shared by the AppShell nav drawer, Dialog and Sheet.
 *
 * @param {boolean} open
 * @param {() => void} onClose  Must be stable (useCallback), or the listeners
 *   are re-bound on every render.
 * @returns {import('react').RefObject<HTMLDialogElement>}
 */
export default function useModalDialog(open, onClose) {
  const ref = useRef(null);
  const returnFocusTo = useRef(null);

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
      onClose();
    };
    const handleBackdropClick = (event) => {
      if (event.target === dialog) dialog.close();
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  return ref;
}
