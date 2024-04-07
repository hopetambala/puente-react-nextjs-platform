import classNames from 'classnames';
import React, { FunctionComponent } from 'react';

import styles from './css/cell.module.css';

interface CellProps {
  /** Render contents within the cell. */
  children?: React.ReactNode

  /** Apply custom styles to the cell. */
  className?: string

  style?: any

  /** Apply custom styles to the td. */
  containerClassName?: string

  /** An optional boolean prop that applys a header cell wrapper instead of a table cell wrapper around children. */
  isHeaderCell?: boolean

  /** Link somewhere on click. */
  href?: string

  /** Give the cell a max width. This can be any format which is accepted by CSS, so "200px", "3em",
   * and "calc(50vw - 5em)" are all valid. Text which exceeds this width will be truncated.
   */
  maxWidth?: string

  /** Do something when the row is clicked. */
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const Cell: FunctionComponent<CellProps> = ({
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

  const Element = ({ children, ...rest }: any) =>
    isHeaderCell ? <th {...rest}>{children}</th> : <td {...rest}>{children}</td>

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
