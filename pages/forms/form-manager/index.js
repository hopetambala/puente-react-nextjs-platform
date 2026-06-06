import FormManager from 'app/epics/FormManager';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import useCurrentUser from 'app/modules/user/useCurrentUser';
import { useGlobalState } from 'app/store';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';


export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}

export default function Manager() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();
  const user = useCurrentUser();

  return (
    <AppShell breadcrumb={['Forms', 'Form Manager']}>
      <PageHeader
        title="Form Manager"
        sub="Create, manage, and export your data collection forms."
      />
      <FormManager
        router={router}
        context={contextManagment}
        user={user}
      />
    </AppShell>
  );
}
