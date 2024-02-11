import {
  Table,
} from 'app/impacto-design-system';
// import { postObjectsToClass, updateObject } from 'app/modules/cloud-code';
// import { useCallback, useEffect, useState } from 'react';
// import { v4 as uuid } from 'uuid';

// import styles from './index.module.scss';

const columns = [

  // header: 'Name',
  // footer: props => props.column.id,
  // columns: [
  {
    accessorKey: 'firstName',
    cell: (info) => info.getValue(),
  },
  {
    accessorFn: (row) => row.lastName,
    id: 'lastName',
    cell: (info) => info.getValue(),
    header: function lastName() {
      return <span>Last Name</span>;
    },
  },
  // ],
  // },
];
const data = [
  {
    firstName: 'Oleksander',
    lastName: 'Zinchenko',
  },
  {
    firstName: 'Ben',
    lastName: 'White',
  },
  {
    firstName: 'Gabriel',
    lastName: 'Martinelli',
  },
  {
    firstName: 'Bukayo',
    lastName: 'Saka',
  },
];

const DataAnalyticsManager = () => (
  <Table data={data} columns={columns} />
);

export default DataAnalyticsManager;
