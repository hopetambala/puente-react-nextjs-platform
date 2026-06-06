import DataAnalyticsManager from 'app/epics/DataAnalyticsManager';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import useCurrentUser from 'app/modules/user/useCurrentUser';

export default function Forms() {
  const user = useCurrentUser();
  return (
    <AppShell breadcrumb={['Data', 'Analysis']}>
      <PageHeader title="Data Analysis" />
      <DataAnalyticsManager user={user} />
    </AppShell>
  );
}
