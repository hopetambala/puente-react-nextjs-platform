import { yupResolver } from '@hookform/resolvers';
import {
  Button,
  Card,
  FormInput,
  Page,
  Stack,
  Text,
  Toast,
} from 'app/impacto-design-system';
import { retrieveSignInFunction } from 'app/modules/user';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import logo from '/public/assets/brand/logo-black.png';

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
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    const { usernameV, passwordV } = data;
    return retrieveSignInFunction(usernameV, passwordV)
      .then(() => {
        // get return url from query parameters or default to '/'
        setLoading(false);
        const returnUrl = router.query.returnUrl || '/quick-start';
        router.push(returnUrl);
      })
      .catch((e) => {
        setLoading(false);
        return toast(<Toast text={`${e.message}`} isError />);
      });
  };

  return (
    <Page>
      <div className={styles.paper}>
        <Card padding="extraLarge" className={styles.card}>
          <FormProvider {...methods}>
            <Stack isVertical spacing="large" className={styles.stack}>
              <div className={styles.logo}>
                <Image fill src={logo} alt="Picture of the author" />
              </div>
              <Text text="Welcome" element="h2" />
              <div>
                <Text text="Email or phone number" element="p" />
                <FormInput
                  name="usernameV"
                  // label="Email or phone number"
                  required
                  errorobj={errors}
                  InputProps={{
                    startAdornment: <span position="start" />,
                  }}
                />
              </div>
              <div>
                <Text text="Password" element="p" />
                <FormInput
                  name="passwordV"
                  // label="Password"
                  required
                  errorobj={errors}
                  InputProps={{
                    startAdornment: <span position="start" />,
                  }}
                />
              </div>
            </Stack>
          </FormProvider>
          <Stack isVertical spacing="medium">
            <Button
              text="Log in"
              onClick={handleSubmit(onSubmit)}
              isFullWidth
              isLoading={loading}
            />
            <Button
              text="Forgot password"
              intent="danger"
              href="/account/login/reset-login"
              isFullWidth
            />
            <Button
              text="Create account"
              intent="primary"
              href="/account/register"
              isFullWidth
            />
          </Stack>
        </Card>
      </div>
    </Page>
  );
};

export default Login;
