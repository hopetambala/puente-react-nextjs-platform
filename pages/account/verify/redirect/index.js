import { Card, Page, Text } from 'app/impacto-design-system';
import { updateUser } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect } from 'react';

function Verify() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const { objectId: userId } = router.query;

  const updateVerificationStatus = async () => {
    const updatedUser = {
      adminVerified: true,
    };
    await updateUser(userId, updatedUser);
  };

  const redirect = async () => {
    await updateVerificationStatus();
    router.push(`/account/verify?objectId=${userId}`);
  };

  useEffect(() => {
    const verify = async () => {
      if (userId) redirect();
    };
    verify();
    if (!userId) router.push('/account/login');
  }, [userId]);

  return (
    <Page>
      <Card padding="extraLarge">
        <Text text={t('account_hold_on')} element="h1" />
      </Card>
    </Page>
  );
}

export default Verify;

// Without this the page ships no catalog, so every `t()` under it — the shell's
// navigation included — renders its own key instead of a word.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}
