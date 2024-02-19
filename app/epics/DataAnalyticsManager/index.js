import { Button, Stack, Table } from "app/impacto-design-system";
import { fact } from "../../../app/modules/django-etl";
import { useEffect, useState } from "react";

const columns = [
  {
    accessorKey: "surveying_organization",
    cell: (info) => info.getValue(),
  },
  {
    accessorFn: (row) => row.question_answer,
    id: "question_answer",
    cell: (info) => info.getValue(),
    header: function question_answer() {
      return <span>Answer to Question</span>;
    },
  },
];
const DataAnalyticsManager = () => {
  const [data, setData] = useState([]);

  const fetchData = async () => {
    const serverData = await fact.list_filter_sort({
      parameters: {
        sort_by: "created_at",
        order: "desc",
        filter_criteria: {
          question_answer: "{Water}",
        },
      },
    });

    const prunedData = serverData.map(
      ({ surveying_organization, question_answer }) => ({
        surveying_organization,
        question_answer,
      })
    );
    setData(prunedData);
  };
 
  useEffect(() => {
    fetchData().catch(console.error); //eslint-disable-line
  },[]);

  return (
    <Stack isVertical spacing="medium">
      <Button text="Retrieve" onClick={fetchData} />
      <Table data={data} columns={columns} />
    </Stack>
  );
};

export default DataAnalyticsManager;
