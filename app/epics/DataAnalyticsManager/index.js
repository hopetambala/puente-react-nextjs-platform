import { Button, Stack, Table } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

import { fact } from '../../modules/django-etl';

const columns = [
  {
    accessorKey: 'surveying_organization',
    cell: (info) => info.getValue(),
  },
  {
    accessorFn: (row) => row.question_answer,
    id: 'question_answer',
    cell: (info) => info.getValue(),
    header: function QuestionAnswerHeader() {
      // A component of its own, so it reads the catalog itself rather than
      // closing over a `t` from a scope that is not a React render.
      const { t } = useTranslation('common');
      return <span>{t('analytics_answer_to_question')}</span>;
    },
  },
];
const DataAnalyticsManager = () => {
  const { t } = useTranslation('common');
  const [data, setData] = useState([]);

  const fetchData = async () => {
    const serverData = await fact.list_filter_sort({
      parameters: {
        sort_by: 'created_at',
        order: 'desc',
        filter_criteria: {
          question_answer: '{Water}',
        },
      },
    });

    // snake_case because these are the Django ETL service's own field names,
    // read straight off its response. Renaming them to satisfy the linter would
    // break the read — the contract belongs to the Python service, not to us.
    /* eslint-disable camelcase */
    const prunedData = serverData.map(
      ({ surveying_organization, question_answer }) => ({
        surveying_organization,
        question_answer,
      }),
    );
    /* eslint-enable camelcase */
    setData(prunedData);
  };

  useEffect(() => {
    fetchData().catch(console.error); //eslint-disable-line
  }, []);

  return (
    <Stack isVertical spacing="medium">
      <Button text={t('analytics_retrieve')} onClick={fetchData} />
      <Table data={data} columns={columns} />
    </Stack>
  );
};

export default DataAnalyticsManager;
