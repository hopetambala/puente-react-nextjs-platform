import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/stack.module.css';
import StackItem from './stack-item';

const Stack = ({
  children,
  fill,
  isVertical,
  isWrapDisabled,
  spacing,
  className,
}) => {
  const classname = classNames(
    styles.stack,
    styles[`spacing-${spacing || 'medium'}Modifier`],
    {
      [styles.verticalModifier]: isVertical,
      [styles.fillModifier]: fill,
      [styles.nowrapModifier]: isWrapDisabled,
    },
    className
  );

  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement(child) || child.type === StackItem) {
      return child;
    }

    return <StackItem>{child}</StackItem>;
  });
  return <div className={classname}>{items}</div>;
};

Stack.propTypes = {
  /** Items to be stacked. */
  children: PropTypes.element.isRequired,

  /** Evenly fill the available space. */
  fill: PropTypes.bool,

  /** Disable children from wrapping to multiple lines. */
  isWrapDisabled: PropTypes.bool,

  /** Stack the items vertically. The default (unset) is horizontal. */
  isVertical: PropTypes.bool,

  /** Adjust the gap between items. */
  spacing: PropTypes.oneOf([
    'extraSmall',
    'small',
    'medium',
    'mediumLarge',
    'large',
    'extraLarge',
    'spaceBetween',
    'none',
  ]),
};

Stack.defaultProps = {
  fill: null,
  isWrapDisabled: null,
  isVertical: false,
  spacing: 'none',
};

export default Stack;
