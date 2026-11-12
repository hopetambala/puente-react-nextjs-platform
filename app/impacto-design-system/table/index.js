import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './css/table.module.css';

/** A column's header as plain text, for the stacked layout's per-cell labels:
 *  `meta.label`, else `meta.labelKey` through t(), else a string header. */
const headerLabel = (column, t) => {
  const { meta, header } = column.columnDef;
  if (meta?.label) return meta.label;
  if (meta?.labelKey) return t(meta.labelKey);
  return typeof header === 'string' ? header : '';
};

/**
 * A data table that stays a table: a caption that names it, column headers
 * scoped to their columns, and plain cells (WCAG 1.3.1).
 *
 * Wide tables scroll inside a focusable region named by the caption, so a
 * keyboard user can scroll them (WCAG 2.1.1). When its container is narrow (a
 * phone, a side panel) each row becomes a stacked card, with every value
 * labelled by its column, instead of scrolling sideways (WCAG 1.4.10). That
 * switch is a container query, so it follows the space the table has, not the
 * window.
 *
 * Columns are @tanstack/react-table column definitions. Give each a string
 * `header`, or `meta: { labelKey }` (a catalog key) when the header is a
 * component, so the stacked layout can label its cells.
 */
const Table = ({
  caption, className, columns, data, emptyContent, isCaptionVisible,
}) => {
  const { t } = useTranslation('common');
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const { rows } = table.getRowModel();

  return (
    <div className={classNames(styles.wrapper, className)}>
      {/* The scroll region is named by the caption and takes focus so it can
          be scrolled from the keyboard. */}
      <div className={styles.scroller} role="region" aria-label={caption} tabIndex={0}>
        {/* Explicit table roles: the stacked layout changes `display` on these
            elements, which in some browsers (WebKit with VoiceOver) drops their
            native table semantics. The roles keep them in every layout. */}
        <table className={styles.table} role="table">
          <caption className={isCaptionVisible ? styles.caption : 'sr-only'}>{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} scope="col" role="columnheader">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} role="row">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} role="cell" data-label={headerLabel(cell.column, t)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className={styles.empty}>{emptyContent ?? <p>{t('table_empty')}</p>}</div>
      )}
    </div>
  );
};

Table.propTypes = {
  /** Names the table and its scroll region. Required: a table needs a name. */
  caption: PropTypes.string.isRequired,
  className: PropTypes.string,
  columns: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  data: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  /** Shown instead of rows when there are none. */
  emptyContent: PropTypes.node,
  /** Show the caption, not only announce it. */
  isCaptionVisible: PropTypes.bool,
};

Table.defaultProps = {
  className: undefined,
  emptyContent: null,
  isCaptionVisible: false,
};

export default Table;
