import { AuthLayout, Spinner } from 'app/impacto-design-system';
import { updateUser } from 'app/modules/user';
import { authErrorKey } from 'app/modules/user/authErrors';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

import styles from '../index.module.scss';

/**
 * /account/verify/redirect?objectId=…: the link an admin follows to verify an
 * account. Marks it admin-verified, then moves on to /account/verify. A failed
 * update is said, in the reader's language, instead of leaving "Hold On" up
 * forever with nothing announced.
 */
function VerifyRedirect() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { objectId: userId } = router.query;
  const [errorKey, setErrorKey] = useState(null);

  useEffect(() => {
    if (!userId) {
      router.push('/account/login');
      return;
    }
    updateUser(userId, { adminVerified: true })
      .then(() => router.push(`/account/verify?objectId=${userId}`))
      .catch((e) => setErrorKey(authErrorKey(e)));
  }, [userId]);

  return (
    <AuthLayout title={t('account_hold_on')}>
      <h1 className={styles.heading}>{t('account_hold_on')}</h1>
      {errorKey
        ? <p role="alert" className={styles.body}>{t(errorKey)}</p>
        : <Spinner />}
    </AuthLayout>
  );
}

export default VerifyRedirect;

// Without this the page ships no catalog, so every `t()` renders its own key.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}
