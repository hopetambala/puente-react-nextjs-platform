import DataAnalyticsManager from 'app/epics/DataAnalyticsManager';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';

export default function Forms() {
  const user = parseUserValue();
  return (
    <AppShell breadcrumb={['Data', 'Analysis']}>
      <PageHeader title="Data Analysis" />
      <DataAnalyticsManager user={user} />
    </AppShell>
  );
}
