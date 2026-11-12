import { yupResolver } from '@hookform/resolvers';
import { AuthLayout, Button, FormInput } from 'app/impacto-design-system';
import { toast } from 'app/impacto-design-system/toast/notify';
import { sendMessage } from 'app/modules/cloud-code';
import { queryUser, retrieveSignOutFunction } from 'app/modules/user';
import { authErrorKey } from 'app/modules/user/authErrors';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from './index.module.scss';

// The stored channel codes sendMessage understands.
const CHANNELS = [
  { value: 'email', labelKey: 'account_reset_channel_email', submitKey: 'account_reset_submit_email' },
  { value: 'text', labelKey: 'account_reset_channel_text', submitKey: 'account_reset_submit_text' },
];

const buildSchema = (t) => yup.object().shape({
  usernameV: yup.string().required(t('login_error_username_required')),
});

/**
 * /account/login/reset-login: "I can't sign in." The person names their
 * account and picks how the reset reaches them.
 */
function ResetLogin() {
  const { t } = useTranslation('common');
  const [channel, setChannel] = useState('email');
  const schema = useMemo(() => buildSchema(t), [t]);
  const methods = useForm({ resolver: yupResolver(schema) });
  const { handleSubmit, errors } = methods;

  const onSubmit = ({ usernameV }) => queryUser(usernameV)
    .then((user) => sendMessage(user, channel))
    .then(() => toast({ text: t('account_reset_sent') }))
    .catch(async (e) => {
      await retrieveSignOutFunction();
      // What the person can act on, in their language, not Parse's English.
      toast({ text: t(authErrorKey(e)), isError: true });
    });

  const { submitKey } = CHANNELS.find((c) => c.value === channel);

  return (
    <AuthLayout title={t('account_reset_title')}>
      <h1 className={styles.heading}>{t('account_reset_title')}</h1>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
          <FormInput
            name="usernameV"
            label={t('account_reset_field')}
            autoComplete="username"
            required
            errorobj={errors}
          />
          {/* Real radios in a named group: the choice and which one is picked
              are announced. They were two buttons that showed the choice by
              colour alone (WCAG 1.4.1, 4.1.2). */}
          <fieldset className={styles.channels}>
            <legend className={styles.legend}>{t('account_reset_channel_legend')}</legend>
            {CHANNELS.map((c) => (
              <label key={c.value} htmlFor={`reset-channel-${c.value}`} className={styles.channel}>
                <input
                  id={`reset-channel-${c.value}`}
                  type="radio"
                  name="channel"
                  value={c.value}
                  checked={channel === c.value}
                  onChange={() => setChannel(c.value)}
                />
                {t(c.labelKey)}
              </label>
            ))}
          </fieldset>
          {/* A whole key per channel: "email" and "text" are stored codes, and
              the two sentences don't share a shape across languages. */}
          <Button type="submit" intent="primary" text={t(submitKey)} isFullWidth />
        </form>
      </FormProvider>
    </AuthLayout>
  );
}

export default ResetLogin;

// Without this the page ships no catalog, so every `t()` renders its own key.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}
