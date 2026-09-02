import FormMarketplace from 'app/epics/FormMarketplace';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import useCurrentUser from 'app/modules/user/useCurrentUser';
import { useGlobalState } from 'app/store';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}

export default function Marketplace() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();
  const user = useCurrentUser();
  const { t } = useTranslation('common');

  return (
    <AppShell breadcrumb={[t('breadcrumb_forms'), t('breadcrumb_marketplace')]}>
      <PageHeader
        title={t('page_form_marketplace_title')}
        sub={t('page_form_marketplace_sub')}
      />
      <FormMarketplace
        router={router}
        context={contextManagment}
        user={user}
      />
    </AppShell>
  );
}
