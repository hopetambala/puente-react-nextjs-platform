import { Table } from "app/impacto-design-system";
import { environmentalHealthRecord } from "../../../app/modules/django-etl";
import { useEffect, useState } from "react";

// import { postObjectsToClass, updateObject } from 'app/modules/cloud-code';
// import { useCallback, useEffect, useState } from 'react';
// import { v4 as uuid } from 'uuid';

// import styles from './index.module.scss';

const columns = [
  // header: 'Name',
  // footer: props => props.column.id,
  // columns: [
  {
    accessorKey: "firstName",
    cell: (info) => info.getValue(),
  },
  {
    accessorFn: (row) => row.lastName,
    id: "lastName",
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
    firstName: "Oleksander",
    lastName: "Zinchenko",
  },
  {
    firstName: "Ben",
    lastName: "White",
  },
  {
    firstName: "Gabriel",
    lastName: "Martinelli",
  },
  {
    firstName: "Bukayo",
    lastName: "Saka",
  },
];

const DataAnalyticsManager = () => {
  const [data, setData] = useState([]);
  const [key, setKey] = useState('clinicaccess_v2');

  useEffect(() => {
    const fetchData = async () => {
      if (!key) return;
      const serverData = await environmentalHealthRecord.retrieve(
        "environmentalhealthbronze/get_count/",
        JSON.stringify({ fields: [key] })
      );

      console.log(serverData)

      //                                                                                                                                                                                                     
    };
    fetchData().catch(console.error); //eslint-disable-line
  }, []);

  return <Table data={data} columns={columns} />;
};

export default DataAnalyticsManager;
