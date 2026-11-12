import { yupResolver } from '@hookform/resolvers';
import {
  AuthLayout,
  Button,
  FormInput,
  LanguageSwitcher,
} from 'app/impacto-design-system';
import { toast } from 'app/impacto-design-system/toast/notify';
import { retrieveSignInFunction } from 'app/modules/user';
import { authErrorKey } from 'app/modules/user/authErrors';
import parseService from 'app/services/parse';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from './index.module.scss';

// Built from the catalog, so an empty field is explained in the reader's
// language (these were English for everyone).
const buildSchema = (t) => yup.object().shape({
  usernameV: yup.string().required(t('login_error_username_required')),
  passwordV: yup.string().required(t('login_error_password_required')),
});

function Login() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const schema = useMemo(() => buildSchema(t), [t]);
  const methods = useForm({ resolver: yupResolver(schema) });
  const { handleSubmit, errors } = methods;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    parseService.initialize();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    const { usernameV, passwordV } = data;
    return retrieveSignInFunction(usernameV, passwordV)
      .then(() => {
        const returnUrl = router.query.returnUrl || '/quick-start';
        router.push(returnUrl);
      })
      // Parse's own message is English and can't tell a wrong password from no
      // connection: show what the person can act on, in their language.
      .catch((e) => toast({ text: t(authErrorKey(e)), isError: true }))
      .finally(() => setLoading(false));
  };

  return (
    <AuthLayout
      title={t('sign_in')}
      tagline={t('login_tagline')}
      footer={(
        <>
          <span>v0.1.2</span>
          <span aria-hidden="true">·</span>
          <span>{t('login_license')}</span>
        </>
      )}
    >
      <p className={styles.eyebrow}>{t('sign_in_to')}</p>
      <h1 className={styles.title}>Puente Manage</h1>
      <p className={styles.sub}>{t('login_sub')}</p>

      {/* A real form, so Enter signs in and password managers recognise it. */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormProvider {...methods}>
          <div className={styles.fields}>
            <FormInput
              name="usernameV"
              label={t('login_field_email')}
              autoComplete="username"
              required
              errorobj={errors}
            />
            <FormInput
              name="passwordV"
              label={t('login_field_password')}
              type="password"
              autoComplete="current-password"
              required
              errorobj={errors}
            />
          </div>
        </FormProvider>

        <Button
          type="submit"
          text={t('sign_in')}
          intent="primary"
          isFullWidth
          isLoading={loading}
        />
      </form>

      <div className={styles.divider}>{t('divider_or')}</div>

      <div className={styles.altLinks}>
        <Link href="/account/login/reset-login" passHref>
          <a className={styles.altLink}>{t('forgot_password')}</a>
        </Link>
        <span className={styles.altSep} aria-hidden="true">·</span>
        <Link href="/account/register" passHref>
          <a className={styles.altLink}>{t('create_account')}</a>
        </Link>
      </div>

      <p className={styles.hint}>{t('login_collect_hint')}</p>

      {/* Settings is behind both sign-in and the current language, so this is
          the only place someone who can't read it can change it. */}
      <LanguageSwitcher className={styles.languageSwitcher} />
    </AuthLayout>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default Login;
