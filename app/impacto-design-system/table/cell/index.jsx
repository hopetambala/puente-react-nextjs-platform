import classNames from 'classnames';
import React from 'react';

import styles from './css/cell.module.css';

// Defined at module scope, not inside Cell. A component created during render
// gets a fresh type on every render, so React tears the cell's DOM down and
// rebuilds it each time instead of updating it. `isHeaderCell` is destructured
// out so that it is not spread onto the th/td as a DOM attribute, matching what
// the previous closure-captured version rendered.
const CellElement = ({ isHeaderCell, children: kids, ...rest }) => (isHeaderCell ? (
  <th {...rest}>
    {kids}
  </th>
) : <td {...rest}>{kids}</td>);

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

  return (
    <CellElement
      isHeaderCell={isHeaderCell}
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
    </CellElement>
  );
};

export default Cell;
