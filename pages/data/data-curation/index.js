import { AppShell, EmptyState, PageHeader } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function DataCuration() {
  const { t } = useTranslation('common');

  return (
    <AppShell breadcrumb={['Data', t('nav_data_curation', { defaultValue: 'Data Curation' })]}>
      <PageHeader
        eyebrow="Data"
        title={t('nav_data_curation', { defaultValue: 'Data Curation' })}
        sub={t('data_curation_sub', { defaultValue: 'Curate, clean, and review collected records.' })}
      />
      <EmptyState message={t('data_curation_empty', { defaultValue: 'Data curation tools are coming soon.' })} />
    </AppShell>
  );
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'eng', ['common'])),
    },
  };
}
