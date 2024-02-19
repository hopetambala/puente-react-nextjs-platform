import classNames from 'classnames';

import styles from '../css/table.module.css';

const Row = ({
  children,
  onClick,
  className,
}) => (
  <tr
    className={classNames(styles.row, className)}
    onClick={onClick}
  >
    {children}
  </tr>
);

export default Row;
