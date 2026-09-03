import DataAnalyticsManager from 'app/epics/DataAnalyticsManager';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import useCurrentUser from 'app/modules/user/useCurrentUser';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// Without this the page ships no catalog, so every `t()` rendered under it —
// the shell's navigation included — falls back to printing its own key.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}

export default function Forms() {
  const user = useCurrentUser();
  const { t } = useTranslation('common');
  return (
    <AppShell breadcrumb={[t('breadcrumb_data'), t('breadcrumb_analysis')]}>
      <PageHeader title={t('page_data_analysis_title')} />
      <DataAnalyticsManager user={user} />
    </AppShell>
  );
}
