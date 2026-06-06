import { yupResolver } from '@hookform/resolvers';
import {
    Button,
    FormInput,
    Toast,
} from 'app/impacto-design-system';
import { retrieveSignInFunction } from 'app/modules/user';
import parseService from 'app/services/parse';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import styles from './index.module.scss';

const validationSchema = yup.object().shape({
  usernameV: yup.string().required('Username or Phone Number is Required'),
  passwordV: yup.string().required('Password is Required'),
});

function Login() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const methods = useForm({ resolver: yupResolver(validationSchema) });
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
      .catch((e) => toast(<Toast text={`${e.message}`} isError />))
      .finally(() => setLoading(false));
  };

  return (
    <div className={styles.login}>
      {/* ── left column: dark brand + quote ── */}
      <div className={styles.left}>
        <div className={styles.leftBrand}>
          <div className={styles.leftBrandMark}>P</div>
          <span className={styles.leftBrandName}>Puente</span>
        </div>

        <div className={styles.quote}>
          <div className={styles.quoteMark}>&ldquo;</div>
          <p className={styles.quoteBody}>
            The clinic ran in a school courtyard. By the time we packed up,
            the records were already in San Juan.
          </p>
          <div className={styles.quoteAttr}>
            Yolanda M., program manager, jornada médica, Las Matas
          </div>
        </div>

        <div className={styles.leftFooter}>
          <span>v0.1.2</span>
          <span>·</span>
          <span>Source available · BSL 1.1</span>
        </div>
      </div>

      {/* ── right column: sign-in form ── */}
      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.eyebrow}>{t('sign_in_to')}</div>
          <h1 className={styles.title}>Puente Manage</h1>
          <p className={styles.sub}>
            Build forms, monitor the field, and analyze responses.
          </p>

          <FormProvider {...methods}>
            <div className={styles.fields}>
              <FormInput
                name="usernameV"
                label={t('login_field_email')}
                required
                errorobj={errors}
              />
              <FormInput
                name="passwordV"
                label={t('login_field_password')}
                type="password"
                required
                errorobj={errors}
              />
            </div>
          </FormProvider>

          <Button
            text={t('sign_in')}
            intent="primary"
            onClick={handleSubmit(onSubmit)}
            isFullWidth
            isLoading={loading}
          />

          <div className={styles.divider}>or</div>

          <div className={styles.altLinks}>
            <Link href="/account/login/reset-login" passHref>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a className={styles.altLink}>{t('forgot_password')}</a>
            </Link>
            <span className={styles.altSep}>·</span>
            <Link href="/account/register" passHref>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a className={styles.altLink}>{t('create_account')}</a>
            </Link>
          </div>

          <div className={styles.hint}>{t('login_collect_hint')}</div>
        </div>
      </div>
    </div>
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
