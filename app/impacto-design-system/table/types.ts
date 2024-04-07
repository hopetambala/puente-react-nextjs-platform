import { ColumnDef, ColumnSizingColumn, RowData, SortingColumn } from '@tanstack/react-table';


export type cell = {
  getSize(): unknown;
  getResizeHandler: any;
  id?: React.Key;
  isPlaceholder?: any;
  column: {
    toggleSorting(desc?: boolean | undefined): SortingColumn<RowData>['toggleSorting'];
    clearSorting(): SortingColumn<RowData>['clearSorting'];
    getSize(): ColumnSizingColumn['getSize'];
    getIsResizing(): ColumnSizingColumn['getIsResizing'];
    getCanResize(): ColumnSizingColumn['getCanResize'];
    getIsSorted(): SortingColumn<RowData>['getIsSorted'];
    getSortIndex(): SortingColumn<RowData>['getSortIndex'];
    getToggleSortingHandler(): SortingColumn<RowData>['getToggleSortingHandler'];
    getCanSort(): SortingColumn<RowData>['getCanSort'];
    columnDef: {
      header?: ColumnDef<RowData>['header'];
      footer?: ColumnDef<RowData>['footer'];
      cell?: ColumnDef<RowData>['cell'];
    };
  };
  getContext: () => any;
};


export type headerFooterGroup = {
  id?: React.Key;
  headers: any[];
};