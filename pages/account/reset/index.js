import { yupResolver } from '@hookform/resolvers';
import {
  AuthLayout, Button, FormInput, Spinner,
} from 'app/impacto-design-system';
import { toast } from 'app/impacto-design-system/toast/notify';
import { retrieveSignInFunction, updateUser } from 'app/modules/user';
import { authErrorKey } from 'app/modules/user/authErrors';
import { useAccount } from 'app/modules/user/useAccount';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from './index.module.scss';

/** The account fields this page edits, under the names the _User model uses. */
const ACCOUNT_FIELDS = ['firstname', 'lastname', 'organization', 'phonenumber', 'email'];

/** Built from `t`, so validation speaks the reader's language. */
export function buildResetSchema(t) {
  return yup.object().shape({
    firstname: yup.string(),
    lastname: yup.string(),
    organization: yup.string().required(t('register_error_organization')),
    phonenumber: yup.string(),
    email: yup.string()
      .email(t('register_error_email_invalid'))
      .required(t('register_error_email_required')),
    password: yup.string().required(t('register_error_password')),
  });
}

/**
 * /account/reset?objectId=…: where someone finishes their account after a
 * reset link. Their stored details, prefilled, and a new password.
 */
function Reset() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { objectId: userId } = router.query;
  const schema = useMemo(() => buildResetSchema(t), [t]);
  const methods = useForm({ resolver: yupResolver(schema) });
  const { reset, handleSubmit, errors } = methods;
  const [submitting, setSubmitting] = useState(false);
  const {
    account, errorKey, loading, retry,
  } = useAccount(userId, ACCOUNT_FIELDS);

  useEffect(() => {
    if (account) reset({ ...account, password: '' });
  }, [account, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    const updated = Object.fromEntries([...ACCOUNT_FIELDS, 'password'].map((f) => [f, data[f]]));
    try {
      const { username, password } = await updateUser(userId, updated);
      await retrieveSignInFunction(username, password);
      router.push('/quick-start');
    } catch (e) {
      toast({ text: t(authErrorKey(e)), isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  // Design review C9: with no account in the link this was a blank form.
  if (!userId) {
    return (
      <AuthLayout title={t('account_reset_missing_title')}>
        <h1 className={styles.heading}>{t('account_reset_missing_title')}</h1>
        <p role="alert" className={styles.body}>{t('account_verify_missing_body')}</p>
        <Link href="/account/login" passHref>
          <a className={styles.link}>{t('account_back_to_sign_in')}</a>
        </Link>
      </AuthLayout>
    );
  }

  let content;
  if (errorKey) {
    content = (
      <>
        <p role="alert" className={styles.body}>{t(errorKey)}</p>
        <Button text={t('action_try_again')} onClick={retry} isFullWidth />
      </>
    );
  } else if (loading) {
    content = <Spinner />;
  } else {
    content = (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.fields}>
            <FormInput name="firstname" label={t('register_field_first_name')} autoComplete="given-name" errorobj={errors} />
            <FormInput name="lastname" label={t('register_field_last_name')} autoComplete="family-name" errorobj={errors} />
            <FormInput name="organization" label={t('register_field_organization')} autoComplete="organization" required errorobj={errors} />
            <FormInput name="phonenumber" label={t('register_field_phone')} type="tel" autoComplete="tel" errorobj={errors} />
            <FormInput name="email" label={t('register_field_email')} type="email" autoComplete="email" required errorobj={errors} />
            <FormInput name="password" label={t('register_field_password')} type="password" autoComplete="new-password" required errorobj={errors} />
          </div>
          <Button type="submit" intent="primary" text={t('continue')} isFullWidth isLoading={submitting} />
        </form>
      </FormProvider>
    );
  }

  return (
    <AuthLayout title={t('account_details_title')}>
      <h1 className={styles.heading}>{t('account_details_title')}</h1>
      {content}
    </AuthLayout>
  );
}

export default Reset;

// Without this the page ships no catalog, so every `t()` renders its own key.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}
