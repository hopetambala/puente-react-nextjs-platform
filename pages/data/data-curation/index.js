import DataCurationManager from 'app/epics/DataCurationManager';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function DataCuration() {
  const { t } = useTranslation('common');

  return (
    <AppShell breadcrumb={[t('breadcrumb_data'), t('nav_data_curation', { defaultValue: 'Data Curation' })]}>
      <PageHeader
        eyebrow={t('breadcrumb_data')}
        title={t('nav_data_curation', { defaultValue: 'Data Curation' })}
        sub={t('data_curation_sub', { defaultValue: 'Curate, clean, and review collected records.' })}
      />
      <DataCurationManager />
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
