import { CardAlt } from 'app/impacto-design-system';

// import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import styles from './index.module.scss';

export default function QuickStart() {
  // const user = retrieveCurrentUserAsyncFunction();
  // const { NEXT_PUBLIC_PUENTE_ANALYTICS_DASHBOARD_URL } = process.env;

  return (
    <div className={styles.index}>
      <main>
        <h1 className={styles.title}>Welcome to Puente Manage</h1>
        <h1>Quick Start Guide</h1>

        <div className={styles.grid}>
          <CardAlt
            title="Form Creator"
            description="Create forms for Collect"
            nextLink="/forms/form-creator"
          />
          <CardAlt
            title="Form Manager"
            description="Manage forms for Collect"
            nextLink="/forms/form-manager"
          />
          <CardAlt
            title="Quick Insights"
            description="Visualize data insights from Collect"
            nextLink="/data/data-visualization"
            shouldOpenTab
          />
          {/* <CardAlt
            title="Analytics Manager"
            description="In-depth analysis tool to dig into your data"
            nextLink="/data/data-analysis"
          /> */}
        </div>
      </main>
    </div>
  );
}
