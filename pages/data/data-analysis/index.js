import DataAnalyticsManager from "app/epics/DataAnalyticsManager";
import { Page } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';

export default function Forms() {
  const user = parseUserValue();
  return (
    <Page header footer>
      <div className="container">
        <main>
          <h1 className="title">
            Data Analysis
            <DataAnalyticsManager user={user} />
          </h1>
        </main>
      </div>
    </Page>
  );
}
