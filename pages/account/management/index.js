import { yupResolver } from '@hookform/resolvers';
import {
  AppShell, Button, Card, FormInput, LanguageSwitcher, Modal, PageHeader, Spinner,
} from 'app/impacto-design-system';
import { toast } from 'app/impacto-design-system/toast/notify';
import {
  retrieveCurrentUserAsyncFunction,
  retrieveSignInFunction,
  updateUser,
} from 'app/modules/user';
import { authErrorKey } from 'app/modules/user/authErrors';
import { useAccount } from 'app/modules/user/useAccount';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from './index.module.scss';

/** Fields this page edits, under the _User model's names. Organization is shown
 *  but not editable (see below). */
const EDITABLE = ['firstname', 'lastname', 'phonenumber', 'email'];

/** Built from `t`, so validation speaks the reader's language. */
export function buildManagementSchema(t) {
  return yup.object().shape({
    firstname: yup.string(),
    lastname: yup.string(),
    phonenumber: yup.string(),
    email: yup.string()
      .email(t('register_error_email_invalid'))
      .required(t('register_error_email_required')),
    password: yup.string(),
  });
}

/**
 * /account/management: the signed-in person's own details, their language,
 * and deactivating the account.
 */
function Management() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { objectId } = router.query;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const schema = useMemo(() => buildManagementSchema(t), [t]);
  const methods = useForm({ resolver: yupResolver(schema) });
  const { reset, handleSubmit, getValues, errors } = methods;

  // The URL's objectId if present, otherwise the signed-in user. With neither
  // (it is a public route), go to sign-in instead of spinning forever.
  const userId = objectId || retrieveCurrentUserAsyncFunction()?.id;
  const {
    account: stored, errorKey, retry,
  } = useAccount(userId, [...EDITABLE, 'organization']);

  useEffect(() => {
    if (!userId || errorKey === 'auth_error_session') router.push('/account/login');
  }, [userId, errorKey]);

  useEffect(() => {
    if (stored) reset({ ...stored, password: '' });
  }, [stored, reset]);

  // Organization comes from the loaded account, never the form: it isn't
  // editable here, and reading it from the form would submit undefined and
  // wipe it.
  const accountFrom = (data) => ({
    ...Object.fromEntries(EDITABLE.map((f) => [f, data[f]])),
    organization: stored.organization,
  });

  const onSubmit = async (data) => {
    const updated = accountFrom(data);
    if (data.password) updated.password = data.password;
    try {
      const { username, password } = await updateUser(userId, updated);
      await retrieveSignInFunction(username, password);
      router.push('/quick-start');
    } catch (e) {
      toast({ text: t(authErrorKey(e)), isError: true });
    }
  };

  const deactivate = async () => {
    setConfirmingDelete(false);
    try {
      await updateUser(userId, { ...accountFrom(getValues()), active: false });
      router.push('/account/login');
    } catch (e) {
      toast({ text: t(authErrorKey(e)), isError: true });
    }
  };

  return (
    <AppShell breadcrumb={[t('breadcrumb_settings')]}>
      <PageHeader title={t('account_settings_title')} sub={t('account_settings_sub')} />
      <div className={styles.paper}>
        {errorKey && (
          <div className={styles.loadingState}>
            {/* Design review C7: a failed lookup used to spin forever. */}
            <p role="alert">{t(errorKey)}</p>
            <Button text={t('action_try_again')} onClick={retry} />
          </div>
        )}
        {!errorKey && !stored && <div className={styles.loadingState}><Spinner /></div>}
        {stored && (
          <Card padding="extraLarge">
            <FormProvider {...methods}>
              {/* Enter saves the details. Delete is a plain button that asks
                  first, so no key press can deactivate an account. */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
                <FormInput name="firstname" label={t('register_field_first_name')} autoComplete="given-name" errorobj={errors} />
                <FormInput name="lastname" label={t('register_field_last_name')} autoComplete="family-name" errorobj={errors} />
                {/* Read-only on purpose. Organization is the tenancy and billing
                    principal: a free-text box here let anyone move themselves
                    into another organization and see its data. Changing it is a
                    staff action. Text, not a <label>: there is no input. */}
                <div className={styles.readOnly}>
                  <span className={styles.readOnlyLabel}>{t('register_field_organization')}</span>
                  <p className={styles.readOnlyValue}>{stored.organization}</p>
                  <p className={styles.readOnlyNote} data-testid="organization-change-note">
                    {t('account_org_change_note')}
                  </p>
                </div>
                <FormInput name="phonenumber" label={t('register_field_phone')} type="tel" autoComplete="tel" errorobj={errors} />
                <FormInput name="email" label={t('register_field_email')} type="email" autoComplete="email" required errorobj={errors} />
                <FormInput name="password" label={t('register_field_password')} type="password" autoComplete="new-password" errorobj={errors} />
                <div className={styles.actions}>
                  <Button type="submit" intent="primary" text={t('account_update_user')} isFullWidth />
                  <Button intent="danger" text={t('account_delete_user')} onClick={() => setConfirmingDelete(true)} isFullWidth />
                </div>
              </form>
            </FormProvider>
          </Card>
        )}

        {/* Outside the form: language is not a _User field, and outside the
            loading branch so it is there while the profile loads. */}
        <Card padding="medium">
          <LanguageSwitcher />
        </Card>
      </div>

      <Modal
        open={confirmingDelete}
        handleClose={() => setConfirmingDelete(false)}
        text={t('account_delete_confirm')}
        actionText={t('account_delete_confirm_action')}
        intent="danger"
        action={deactivate}
      />
    </AppShell>
  );
}

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}

export default Management;
