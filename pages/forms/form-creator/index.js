import FormCreator from 'app/epics/FormCreator';
import { AppShell } from 'app/impacto-design-system';
import useCurrentUser from 'app/modules/user/useCurrentUser';
import { useGlobalState } from 'app/store';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}

export default function Forms() {
  const { contextManagment } = useGlobalState();
  const user = useCurrentUser();
  const { t } = useTranslation('common');
  return (
    <AppShell breadcrumb={[t('breadcrumb_forms'), t('form_creator_title')]} fullBleed>
      <FormCreator
        context={contextManagment}
        user={user}
      />
    </AppShell>
  );
}
