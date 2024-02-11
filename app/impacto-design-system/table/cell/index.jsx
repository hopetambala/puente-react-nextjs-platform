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

  const Element = ({ children: kids, ...rest }) => (isHeaderCell ? (
    <th {...rest}>
      {kids}
    </th>
  ) : <td {...rest}>{kids}</td>);

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
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onClick}
          className={classes}
        >
          {children}
        </div>
      )}
    </Element>
  );
};

export default Cell;
