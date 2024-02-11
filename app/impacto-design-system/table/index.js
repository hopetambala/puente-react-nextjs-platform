import {
  // ColumnDef,
  // ColumnSort,
  // OnChangeFn,
  // RowData,
  // SortingState,
  // VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import classNames from 'classnames';
// import { map } from 'lodash';
import React, { useState } from 'react';

import Cell from './cell';
// import { Checkbox, Empty, Icon, MenuOption, Popover } from '../../';
// import { StrictReactNode } from '../../types';
import styles from './css/table.module.css';
// import { ITableActionsProps, TableActions } from './table-actions/table-actions';
import Row from './row';
// import { cell, headerFooterGroup } from './types';

// interface ITableProps<Data extends IdentifiedRowData> {
//   /** An optional classname string to apply to the outer level rendered DOM node. */
//   className?: string;

//   /** An array prop for column headers and accessors for the table */
//   columns: ColumnDef<Data, any>[];

//   /** A string prop for the desired name for rows used in table */
//   units: string;

//   /** An array of data to pass into the table */
//   data: readonly Data[];

//   /**
//    * An optional column visibility state
//    */
//   columnVisibility?: VisibilityState;

//   /** An optional prop to manage the state of the header checked cell */
//   isGloballySelected?: boolean;

//   /** A boolean prop to apply resizabilityto columns in the table */
//   isResizable?: boolean;

//   /** An optional setting controlling the sticky property on the first column. When
//    * set to `true` the first column will be set to position sticky to the left of the table. When
//    * the width of the table is smaller than the width of its content, it will scroll horizontally
//    * and the first column will remain sticky to the left. When set to false, the first column will
//    * scroll horizontally along with the rest of the columns.
//    * @default true
//    */
//   isFirstColumnSticky?: boolean;

//   /**
//    * An optional sorting state prop to manage the asc/desc order of rows in a table based on a column id
//    */
//   sorting?: ColumnSort[];

//   /**
//    * Setter for columnVisibility
//    */
//   setColumnVisibility?: OnChangeFn<VisibilityState>;

//   /**
//    * An optional hook prop to set the sorting state of the table.
//    */
//   onSortingChange?: OnChangeFn<SortingState>;

//   /**
//    * An optional boolean prop to toggle if the table has header actions
//    */
//   hasTableActions?: boolean;

//   /**
//    * A optional string array that holds the ids of selected rows
//    */
//   selectedRows?: string[];

//   /**
//    * An optional hook prop to set the selected rows of the table.
//    */
//   onSelectedRowsChanged?: (rows: string[]) => void;

//   /**
//    * An optional prop for empty state content
//    */
//   emptyContent?: StrictReactNode;

//   /**An optional prop for footer content like pagination */
//   footer?: React.ReactNode;

//   /**An optional column that will appear when the users mouse is over the row. */
//   hoverActions?: ColumnDef<Data, any>;
// }

const renderHeaderCells = (header) => (header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext()));

// type SortIconDirection = {
//   isUp: boolean | (() => number);
//   isDown: boolean | (() => number);
// };

// const RenderSortIcon = (
//   header: cell,
//   shouldSort: boolean,
//   isDesc: boolean | null,
//   setIsDesc: React.Dispatch<React.SetStateAction<boolean | null>>,
//   previousSorting: ColumnSort[],
// ) => {
//   const { getCanSort, toggleSorting, getSortIndex, clearSorting } = header.column;

//   const toggleSort = (descSort: boolean) => {
//     const previousSortingColumn = previousSorting[0]?.id;

//     if (descSort === isDesc && previousSortingColumn === header.id) {
//       setIsDesc(null);
//       return clearSorting();
//     }
//     setIsDesc(descSort);
//     return toggleSorting(descSort);
//   };

//   if (!getCanSort() || !shouldSort) {
//     return null;
//   }

//   type SortArrowProps = {
//     direction: SortIconDirection;
//   };

//   const SortArrow = ({ direction }: SortArrowProps) => {
//     const classes = classNames(buttonStyles.iconButton, styles.sortIcon);

//     const { isUp, isDown } = direction;
//     return (
//       <div className={classes}>
//         <Icon name="arrowDropUp" color={isUp ? 'darkGray' : 'lightGray'} size="small" />
//         <Icon name="arrowDropDown" color={isDown ? 'darkGray' : 'lightGray'} size="small" />
//       </div>
//     );
//   };

//   const sortIndex = getSortIndex();
//   const isDescending = isDesc === true;

//   const direction: SortIconDirection = {
//     isUp: sortIndex || !isDescending,
//     isDown: sortIndex || isDescending,
//   };

//   return (
//     <Popover shouldOpenOnHover trigger={<SortArrow direction={direction} />}>
//       <MenuOption text="Sort Ascending" icon="arrowUpward" onClick={() => toggleSort(false)} />
//       <MenuOption text="Sort Descending" icon="arrowDownward" onClick={() => toggleSort(true)} />
//     </Popover>
//   );
// };

// const renderResizeHandler = (header: cell) =>
//   header.column.getCanResize() && (
//     <div
//       role="slider"
//       tabIndex={0}
//       aria-valuenow={undefined}
//       onMouseDown={header.getResizeHandler()}
//       onTouchStart={header.getResizeHandler()}
//       className={[styles.resizer, header.column.getIsResizing() ? styles.isResizing : ''].join(' ')}
//     ></div>
//   );

// const renderDefaultEmptyState = (units: string) => <Empty title={`No ${units} found`} />;
const renderDefaultEmptyState = (units) => (
  <p title={`No ${units} found`} />
);

// /** Adds a default ID to a column definition if one is not present. */
// const withGuaranteedId = <Data extends RowData>(
//   column: ColumnDef<Data, any>,
//   id: string,
// ): ColumnDef<Data, any> & { id: string } => ({
//   ...column,
//   id: column.id ?? id,
// });

const Table = ({
  // allRowsLength,
  className,
  columns,
  data,
  // titleText,
  units,
  emptyContent = renderDefaultEmptyState(units),
  footer,
  columnVisibility,
  isResizable,
  // isGloballySelected,
  hasTableActions = false,
  // selectedRows,
  // onSelectedRowsChanged,
  sorting,
  onSortingChange,
  // primarySlotActions,
  // primarySlotBulkActions,
  // secondarySlotActions,
  // selectedRowsLength,
  setColumnVisibility,
  // bannerContent,
  // subTitle,
  // isTitleVertical,
  hoverActions: hoverActionsInput,
}) => {
  const wrapperClasses = classNames(styles.wrapper, className);
  const tableClasses = classNames(styles.tableWrapper, styles.stickyFirstColumn, {
    [styles.hasTableActions]: !!hasTableActions,
    [styles.hasHoverActions]: !!hoverActionsInput,
  });

  const [isDesc, setIsDesc] = useState(null);

  // const shouldSort = sorting ? true : false;

  // this needs an ID so we can attach CSS to the associated cell
  const hoverActions = hoverActionsInput && withGuaranteedId(hoverActionsInput, 'hoverColumn');

  // const isHeaderCellChecked =
  //   isGloballySelected ||
  //   (selectedRows && selectedRows.length > 0 && selectedRows.length === data.length) ||
  //   false;

  // const isIndeterminateChecked = selectedRows
  //   ? selectedRows?.length > 0 && selectedRows.length < data.length
  //   : undefined;

  const table = useReactTable({
    data, // ignore readonly restriction as we pass into third party code we cannot change
    columns: [...columns, ...(hoverActions ? [hoverActions] : [])],
    enableColumnResizing: isResizable || false,
    columnResizeMode: isResizable === true ? 'onChange' : undefined,
    state: {
      sorting,
      columnVisibility,
    },
    manualSorting: true,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
  });

  // const handleSelect = (rowId) => {
  //   if (!selectedRows) return;
  //   const newValues = [...selectedRows];
  //   const targetIdx = newValues.findIndex((it) => it === rowId);

  //   if (targetIdx > -1) {
  //     newValues.splice(targetIdx, 1);
  //   } else {
  //     newValues.push(rowId);
  //   }
  //   if (onSelectedRowsChanged) onSelectedRowsChanged(newValues);
  // };

  // const handleSelectAll = (e) => {
  //   const checkedRows = e.target.checked ? map(data, 'id') || [] : [];
  //   if (!onSelectedRowsChanged) return;
  //   if (checkedRows.length) {
  //     onSelectedRowsChanged(checkedRows);
  //   } else {
  //     onSelectedRowsChanged([]);
  //   }
  // };

  return (
    <div className={wrapperClasses}>
      {/* <TableActions
        titleText={titleText}
        subTitle={subTitle}
        isTitleVertical={isTitleVertical}
        units={units}
        allRowsLength={allRowsLength ?? data.length}
        selectedRowsLength={selectedRowsLength ?? selectedRows?.length}
        primarySlotActions={primarySlotActions}
        primarySlotBulkActions={primarySlotBulkActions}
        secondarySlotActions={secondarySlotActions}
        bannerContent={bannerContent}
      /> */}
      <div className={tableClasses}>
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Row
                key={headerGroup.id}
                // hasTableActions={hasTableActions}
                // selectedRows={selectedRows}
              >
                {hasTableActions && (
                  <Cell
                    isHeaderCell
                  >
                    <p>I'm a header cell   </p>
                    {/* <Checkbox
                      id="table-checkbox"
                      isChecked={isHeaderCellChecked}
                      isIndeterminate={isIndeterminateChecked}
                      onChange={handleSelectAll}
                    /> */}
                  </Cell>
                )}
                {headerGroup.headers.map((header) => (
                  <Cell key={header.id} isHeaderCell>
                    {renderHeaderCells(header)}
                    {/* {RenderSortIcon(header, shouldSort, isDesc, setIsDesc, sorting || [])}
                    {isResizable && renderResizeHandler(header)} */}
                  </Cell>
                ))}
              </Row>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Row>
                {row.getVisibleCells().map((cell) => (
                  <Cell
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    // containerClassName={
                    //   cell.column.id === hoverActions?.id ? styles.hoverActions : undefined
                    // }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Cell>
                ))}
              </Row>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <div className={styles.emptyContainer}>{emptyContent}</div>
        )}
      </div>
      {table.getRowModel().rows.length !== 0 && footer}
    </div>
  );
};

export default Table;
