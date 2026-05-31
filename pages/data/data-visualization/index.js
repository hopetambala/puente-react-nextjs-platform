import { AppShell, EmptyState, PageHeader, Panel, RadioGroup, SegmentedControl } from 'app/impacto-design-system';
import { BarChart } from 'app/impacto-design-system/visualizations';
import { useEffect, useState } from 'react';

import { environmentalHealthRecord } from '../../../app/modules/django-etl';
import styles from './css/dashboard.module.css';

const CHART_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'line', label: 'Line' },
];

const options = [
  { value: 'typeofwaterdoyoudrink', label: 'Type of water you drink', subLabel: 'typeofwaterdoyoudrink' },
  { value: 'yearslivedinthecommunity', label: 'Years in Community', subLabel: 'yearslivedinthecommunity' },
  { value: 'clinicaccess_v2', label: 'Clinic Access', subLabel: 'clinicaccess_v2' },
  { value: 'floormaterial', label: 'Floor Material', subLabel: 'floormaterial' },
];

function Forms() {
  const [data, setData] = useState([]);
  const [key, setKey] = useState();
  const [chartType, setChartType] = useState('bar');

  const dashboardClasses = [styles.dashboard, 'impacto-card'].join(' ');

  useEffect(() => {
    const fetchData = async () => {
      if (!key) return;
      const serverData = await environmentalHealthRecord.retrieve(
        'environmentalhealthbronze/get_count/',
        JSON.stringify({ fields: [key] }),
      );

      setData(
        serverData.filter((obj) => Object.values(obj).every((value) => value !== null)),
      );
    };
    fetchData().catch(console.error); //eslint-disable-line
  }, [key]);

  return (
    <AppShell breadcrumb={['Data', 'Quick Insights']}>
      <PageHeader title="Quick Insights" />
      <div className={dashboardClasses}>
        <div className={styles.dimensions}>
          <Panel title="Dimensions">
            <RadioGroup options={options} value={key || ''} onChange={setKey} />
          </Panel>
        </div>
        <div className={styles.content}>
          <Panel
            title="Chart"
            action={(
              <SegmentedControl
                options={CHART_TYPES}
                value={chartType}
                onChange={setChartType}
              />
            )}
          >
            {!key && <EmptyState message="Select a dimension to view chart." />}
            {key && data.length > 0 && (
              <BarChart
                data={data}
                indexBy={key}
                groupMode={chartType === 'stacked' ? 'stacked' : 'grouped'}
              />
            )}
            {key && data.length === 0 && (
              <EmptyState message="No data for the selected dimension." />
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

export default Forms;

export function getServerSideProps() {
  return {
    redirect: {
      destination: '/data/data-curation',
      permanent: true,
    },
  };
}
