import classnames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { usePopper } from 'react-popper';
import { animated, useTransition } from 'react-spring';

import styles from './css/tooltip.module.css';

const Tooltip = ({ children, position, trigger, shouldEllipsis }) => {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { styles: popperStyles, attributes } = usePopper(
    referenceElement,
    popperElement,
    {
      modifiers: [
        { name: 'offset', options: { offset: [0, 4] } },
        { name: 'preventOverflow', options: { padding: 8 } },
        { name: 'eventListeners' },
        { name: 'hide' },
      ],
      placement: position || 'top',
    }
  );

  const tooltipWrapperClass = classnames(styles.tooltipTriggerWrapper, {
    [styles.ellipsis]: shouldEllipsis,
  });

  const handleMouseOver = () => setIsOpen(true);

  const handleMouseLeave = () => setIsOpen(false);

  const transitions = useTransition(isOpen, {
    from: { opacity: 0, transform: 'scale(0.8)' },
    enter: { opacity: 1, transform: 'scale(1)' },
    leave: { opacity: 0 },
    delay: 1000,
    config: { tension: 600, friction: 30 },
  });

  return (
    <>
      <div
        ref={setReferenceElement}
        onMouseOver={handleMouseOver}
        onFocus={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        className={tooltipWrapperClass}
      >
        {trigger}
      </div>
      {transitions(
        (transtyles, item, transitionProps) =>
          item && (
            <div
              ref={setPopperElement}
              style={popperStyles.popper}
              {...attributes.popper}
            >
              <animated.div className={styles.tooltip} style={transitionProps}>
                {children}
              </animated.div>
            </div>
          )
      )}
    </>
  );
};

Tooltip.propTypes = {
  /** Contents to display within the tooltip. */
  children: PropTypes.element.isRequired,

  /** Default placement for the tooltip. */
  position: PropTypes.oneOf(['top', 'bottom', 'right', 'left']),

  /** Trigger element which, when hovered, displays the tooltip. */
  trigger: PropTypes.node.isRequired,

  /** Determines wheather or not we ellipsis the text within the tooltip */
  shouldEllipsis: PropTypes.bool,
};

Tooltip.defaultProps = {
  position: 'top',
  shouldEllipsis: false,
};

export default Tooltip;
