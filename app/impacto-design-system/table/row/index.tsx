import classNames from 'classnames';

import { FunctionComponent } from 'react';
import styles from '../css/table.module.css';

interface RowProps {
  /** Contents to render within the row. Should be composed exclusively of `TableCell`s. */
  children?: React.ReactNode;

  /** Apply custom styles to the row. */
  className?: string;

  /**
   * An optional boolean prop to toggle if the table has header actions
   */
  hasTableActions?: boolean;

  /**
   * A optional string array that holds the ids of selected rows
   */
  selectedRows?: string[] | undefined;

  /**
   * A optional function array that handles the selection of a specific row and adds it to the selectedRows state.
   */
  handleSelect?: (rowId: string) => void;

  /**
   * A optional function array that handles the selection of a specific row and adds it to the selectedRows state.
   */
  rowId?: string;

  /** An optional callback when the row is clicked. */
  onClick?: () => void;
}


const Row: FunctionComponent<RowProps> = ({
  children,
  onClick,
  className,
}: RowProps) => {
  return (
    <tr className={classNames(styles.row, className)} onClick={onClick}>
      {children}
    </tr>
  )
}

export default Row;
