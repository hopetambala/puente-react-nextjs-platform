import { yupResolver } from '@hookform/resolvers';
import {
  Button, Card, Stack, Text,
} from 'app/components/design-system/elements';
import FormInput from 'app/components/design-system/molecules/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { retrieveSignInFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from './index.module.scss';

const validationSchema = yup.object().shape({
  usernameV: yup.string().required('Username or Phone Number is Required'),
  passwordV: yup.string().required('Password is Required'),
});

const Login = () => {
  const router = useRouter();
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });
  const { handleSubmit, errors } = methods;

  const onSubmit = (data) => {
    const { usernameV, passwordV } = data;
    return retrieveSignInFunction(usernameV, passwordV)
      .then(() => {
        // get return url from query parameters or default to '/'
        const returnUrl = router.query.returnUrl || '/quick-start';
        router.push(returnUrl);
      });
  };

  return (
    <Page>
      <div className={styles.paper}>
        <Card padding="extraLarge">
          <Text text="PUENTE" element="h1" className={styles.stack} />
          <Stack isVertical className={styles.stack}>
            <Text text="Sign in to Manage" element="h2" />
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
              <FormInput
                name="passwordV"
                label="Password"
                required
                errorobj={errors}
                InputProps={{
                  startAdornment: <span position="start" />,
                }}
              />
            </Stack>
          </FormProvider>
          <Stack isVertical spacing="large">
            <Button
              text="Continue"
              onClick={handleSubmit(onSubmit)}
              isFullWidth
            />
            <Button
              text="Create account"
              intent="primary"
              href="/account/register"
              isFullWidth
            />
            <Button
              text="Reset password"
              intent="danger"
              href="/account/login/reset-login"
              isFullWidth
            />
          </Stack>
        </Card>
      </div>
    </Page>
  );
};

export default Login;
