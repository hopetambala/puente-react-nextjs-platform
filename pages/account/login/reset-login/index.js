import { yupResolver } from '@hookform/resolvers';
import {
  Button, Card, Stack, Text, Toast,
} from 'app/components/elements';
import FormInput from 'app/components/molecules/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { queryUser } from 'app/modules/user';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import MessagingModule from '../../../../app/modules/messaging';
import styles from './index.module.scss';

const validationSchema = yup.object().shape({
  usernameV: yup.string().required('Username or Phone Number is Required'),
});

const restParams = (type) => {
  if (type === 'email') {
    return {
      path: 'email',
      data: {
        emailSubject: 'Account Reset',
        type: 'passwordReset',
      },
    };
  }
  if (type === 'text') {
    return {
      path: 'text',
      data: {
        type: 'accountReset',
      },
    };
  }
  return null;
};

const ResetLogin = () => {
  const [notificationType, setNotificationType] = useState('email');
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });
  const { handleSubmit, errors } = methods;

  const retrieveUser = (username) => queryUser(username)
    .then((user) => {
      const data = restParams(notificationType);
      return MessagingModule(data, user);
    });

  const onSubmit = (data) => {
    const { usernameV } = data;
    return retrieveUser(usernameV).then(() => toast(
      <Toast text="Request Sent!" />,
    )).catch((e) => toast(
      <Toast text={`${e.message}`} isError />,
    ));
  };

  return (
    <Page>
      <div className={styles.paper}>
        <Card padding="extraLarge">
          <Stack isVertical className={styles.stack}>
            <Text text="Reset your account" element="h2" />
          </Stack>
          <FormProvider {...methods}>
            <Stack
              isVertical
              spacing="large"
              className={styles.stack}
            >
              <FormInput
                name="usernameV"
                label="Phone Number or Email Address"
                required
                errorobj={errors}
                InputProps={{
                  startAdornment: <span position="start" />,
                }}
              />
            </Stack>
          </FormProvider>
          <Stack spacing="medium" fill>
            <Button
              intent={notificationType === 'email' ? 'primary' : ''}
              onClick={() => setNotificationType('email')}
              text="Send account reset email?"
              isFullWidth
            />
            <Button
              intent={notificationType === 'text' ? 'primary' : ''}
              onClick={() => setNotificationType('text')}
              text="Send account reset text?"
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
};

export default ResetLogin;
