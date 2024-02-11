import classNames from 'classnames';
import React from 'react';

import styles from './css/cell.module.css';

const Cell = ({
  children,
  className,
  href,
  maxWidth,
  onClick,
  onMouseEnter,
  onMouseLeave,
  containerClassName,
  style,
  isHeaderCell,
}) => {
  const classes = classNames(styles.cell, { [styles.hasMaxWidth]: !!maxWidth }, className);

  const cssStyles = {
    maxWidth,
    ...style,
  };

  const Element = ({ children, ...rest }) => (isHeaderCell ? (
    <th {...rest}>
      {' '}
      {children}
    </th>
  ) : <td {...rest}>{children}</td>);

  return (
    <Element
      role="cell"
      className={containerClassName}
      style={cssStyles}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {href ? (
        <a href={href} className={classes} onClick={onClick}>
          {children}
        </a>
      ) : (
        <div
          role={onClick ? 'button' : ''}
          onClick={onClick}
          className={classes}
        >
          {children}
        </div>
      )}
    </Element>
  );
};

export default Cell;
