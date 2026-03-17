import DataAnalyticsManager from 'app/epics/DataAnalyticsManager';
import { Page } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';

export default function Forms() {
  const user = parseUserValue();
  return (
    <Page header footer>
      <div className="container">
        <main>
          <h1 className="title">Data Analysis</h1>
          <DataAnalyticsManager user={user} />
        </main>
      </div>
    </Page>
  );
}
