import { yupResolver } from '@hookform/resolvers';
import {
  Button,
  Card,
  FormInput,
  Page, Stack,
  Text,
  Toast,
} from 'app/impacto-design-system';
import { sendMessage } from 'app/modules/cloud-code';
import { queryUser, retrieveSignOutFunction } from 'app/modules/user';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import styles from './index.module.scss';

const validationSchema = yup.object().shape({
  usernameV: yup.string().required('Username or Phone Number is Required'),
});

function ResetLogin() {
  const { t } = useTranslation('common');
  const [notificationType, setNotificationType] = useState('email');
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });
  const { handleSubmit, errors } = methods;

  const retrieveUser = (username) => queryUser(username)
    .then((user) => sendMessage(user, notificationType));

  const onSubmit = (data) => {
    const { usernameV } = data;
    return retrieveUser(usernameV).then(() => toast(
      <Toast text={t('account_reset_sent')} />,
    )).catch(async (e) => {
      await retrieveSignOutFunction();
      return toast(
        <Toast text={`${e.message}`} isError />,
      );
    });
  };

  return (
    <Page>
      <div className={styles.paper}>
        <Card padding="extraLarge">
          <Stack isVertical className={styles.stack}>
            <Text text={t('account_reset_title')} element="h2" />
          </Stack>
          <FormProvider {...methods}>
            <Stack
              isVertical
              spacing="large"
              className={styles.stack}
            >
              <FormInput
                name="usernameV"
                label={t('account_reset_field')}
                required
                errorobj={errors}
              />
            </Stack>
          </FormProvider>
          <Stack spacing="medium" fill>
            <Button
              intent={notificationType === 'email' ? 'primary' : ''}
              onClick={() => setNotificationType('email')}
              text={t('account_reset_send_email')}
              isFullWidth
            />
            <Button
              intent={notificationType === 'text' ? 'primary' : ''}
              onClick={() => setNotificationType('text')}
              text={t('account_reset_send_text')}
              isFullWidth
            />
          </Stack>
          <Stack isVertical spacing="medium">
            <Button
              text={`Send reset ${notificationType}`}
              onClick={handleSubmit(onSubmit)}
              isFullWidth
            />
          </Stack>
        </Card>
      </div>
    </Page>
  );
}

export default ResetLogin;

// Without this the page ships no catalog, so every `t()` under it — the shell's
// navigation included — renders its own key instead of a word.
export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'eng', ['common'])) } };
}
