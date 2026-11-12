import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';

import styles from './css/tooltip.module.css';

// A short wait before a hover opens it, so sweeping the pointer across a row
// of icon buttons doesn't flash every tooltip. Keyboard focus opens it at once.
const HOVER_DELAY_MS = 300;
// Time to move the pointer from the trigger onto the tooltip without it closing.
const LEAVE_GRACE_MS = 150;

/**
 * A visual label for an icon-only control, shown on hover and on keyboard
 * focus (WCAG 1.4.13: hoverable, dismissible with Esc, persistent while the
 * pointer is on it).
 *
 * It repeats the control's accessible name, which the control already carries
 * (Button puts the text in a visually hidden span), so the bubble itself is
 * hidden from screen readers rather than announced twice. Rendered in a
 * portal so an `overflow: hidden` ancestor can't clip it.
 */
const Tooltip = ({ children, position, trigger }) => {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const timer = useRef(null);
  const { styles: popperStyles, attributes } = usePopper(referenceElement, popperElement, {
    modifiers: [
      { name: 'offset', options: { offset: [0, 6] } },
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip' },
    ],
    placement: position,
  });

  const clear = () => { clearTimeout(timer.current); };
  const openNow = () => { clear(); setIsOpen(true); };
  const openSoon = () => { clear(); timer.current = setTimeout(() => setIsOpen(true), HOVER_DELAY_MS); };
  const closeSoon = () => { clear(); timer.current = setTimeout(() => setIsOpen(false), LEAVE_GRACE_MS); };
  const closeNow = () => { clear(); setIsOpen(false); };

  useEffect(() => clear, []);

  // Esc dismisses it without moving focus or closing anything else.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      clearTimeout(timer.current);
      setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* The wrapper only listens for hover and focus moving through it; the
          control inside is what takes clicks and focus. */}
      <span
        ref={setReferenceElement}
        className={styles.trigger}
        onMouseEnter={openSoon}
        onMouseLeave={closeSoon}
        onFocus={openNow}
        onBlur={closeNow}
      >
        {trigger}
      </span>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={setPopperElement}
          className={styles.tooltip}
          style={popperStyles.popper}
          aria-hidden="true"
          onMouseEnter={clear}
          onMouseLeave={closeSoon}
          {...attributes.popper}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
};

Tooltip.propTypes = {
  /** The bubble's content: the control's name, as text. */
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  /** The control the tooltip labels. */
  trigger: PropTypes.node.isRequired,
};

Tooltip.defaultProps = {
  position: 'top',
};

export default Tooltip;
