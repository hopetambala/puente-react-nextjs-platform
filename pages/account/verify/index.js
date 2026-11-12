import { AuthLayout, Button } from 'app/impacto-design-system';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import styles from './index.module.scss';

/**
 * /account/verify?objectId=…: where an admin-verified account lands.
 *
 * The outcome is derived from the link, not from state set after mount, so the
 * h1 is never empty (it was, on first render, before saying "Verified" or
 * "Error" in English). The outcome is announced: a status when it worked, an
 * alert with a way forward when the link is incomplete.
 */
function Verify() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { objectId: userId } = router.query;

  if (!userId) {
    return (
      <AuthLayout title={t('account_verify_missing_title')}>
        <h1 className={styles.heading}>{t('account_verify_missing_title')}</h1>
        <p role="alert" className={styles.body}>{t('account_verify_missing_body')}</p>
        <Link href="/account/login" passHref>
          <a className={styles.link}>{t('account_back_to_sign_in')}</a>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('account_verified_title')}>
      <div role="status">
        <h1 className={styles.heading}>{t('account_verified_title')}</h1>
      </div>
      <Button text={t('continue')} intent="primary" onClick={() => router.push('/account/login')} isFullWidth />
    </AuthLayout>
  );
}

export default Verify;

// Without this the page ships no catalog, so every `t()` renders its own key.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}
