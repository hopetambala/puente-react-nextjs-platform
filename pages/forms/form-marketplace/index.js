import FormMarketplace from 'app/epics/FormMarketplace';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';
import { useGlobalState } from 'app/store';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}

export default function Marketplace() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();
  const user = parseUserValue();

  return (
    <AppShell breadcrumb={['Forms', 'Marketplace']}>
      <PageHeader title="Form Marketplace" sub="Browse and duplicate community data collection forms." />
      <FormMarketplace
        router={router}
        context={contextManagment}
        user={user}
      />
    </AppShell>
  );
}
