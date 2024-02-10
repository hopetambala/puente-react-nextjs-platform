import { Card, Page } from 'app/impacto-design-system';
import { BarChart } from 'app/impacto-design-system/visualizations';
import { useEffect, useState } from 'react';

import { environmentalHealthRecord } from '../../../app/modules/django-etl';
import styles from './css/dashboard.module.css';

const filters = {
  'Type of water you drink': 'typeofwaterdoyoudrink',
  'Years in Community': 'yearslivedinthecommunity',
  'Clinic Access': 'clinicaccess_v2',
  'Floor Material': 'floormaterial',
};
const Forms = () => {
  const [data, setData] = useState([]);
  const [key, setKey] = useState();

  const dashboardClasses = [styles.dashboard, 'impacto-card'].join(' ');

  useEffect(() => {
    const fetchData = async () => {
      if (!key) return;
      const serverData = await environmentalHealthRecord.retrieve(
        'environmentalhealthbronze/get_count/',
        JSON.stringify({ fields: [key] }),
      );

      console.log(serverData);

      setData(
        serverData.filter((obj) => Object.values(obj).every((value) => value !== null)),
      );
    };
    fetchData().catch(console.error);
  }, [key]);

  return (
    <Page header footer>
      <h1>Data Analytics</h1>
      <div className={dashboardClasses}>
        <div className={styles.dimensions}>
          <h2>Dimensions</h2>
          {Object.keys(filters).map((filter) => (
            <Card onClick={() => setKey(filters[filter])}>
              {filter}
            </Card>
          ))}
        </div>
        <div className={styles.filters}>
          <h2>Filters</h2>
          <div>{Object.keys(filters).filter((k) => filters[k] === key)[0]}</div>
        </div>
        <div className={styles.content}>
          {data.length > 0 && <BarChart data={data} indexBy={key} />}
        </div>
      </div>
    </Page>
  );
};

export default Forms;
