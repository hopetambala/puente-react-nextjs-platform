import { yupResolver } from '@hookform/resolvers';
import {
  Button,
  Card,
  Stack,
  Text,
  Toast,
} from 'app/components/design-system/elements';
import FormInput from 'app/components/design-system/molecules/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { retrieveSignUpFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import styles from './index.module.scss';

const phoneRegExp =
  /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

const validationSchema = yup.object().shape({
  firstname: yup.string(),
  lastname: yup.string(),
  organization: yup.string().required('Organization Name is required'),
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email Address is required'),
  phonenumber: yup.string().matches(phoneRegExp, 'Password is required'),
  password: yup.string().required('Password is required'),
  passwordconfirmation: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match'),
});

const Register = () => {
  const router = useRouter();
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });
  const [notificationType, setNotificationType] = useState('email');

  const { handleSubmit, errors } = methods;

  const onSubmit = async (user) => {
    await retrieveSignUpFunction(user, notificationType)
      .then(() => {
        router.push('/quick-start');
      })
      .catch((e) => toast(<Toast text={`${e.message}`} isError />));
  };

  return (
    <Page>
      <div className={styles.paper}>
        <Card padding="extraLarge">
          <Stack isVertical spacing="medium">
            <Text text="Create an account" element="h2" />
            <Text text="Required fields have an asterisk: *" element="p" />
          </Stack>
          <FormProvider {...methods}>
            <Stack isVertical className={styles.stack}>
              <FormInput
                name="firstname"
                label="First Name"
                errorobj={errors}
              />
              <FormInput name="lastname" label="Last Name" errorobj={errors} />
              <FormInput
                name="organization"
                label="Organization Name"
                required
                errorobj={errors}
              />
              <FormInput
                name="email"
                label="Email Address"
                required
                errorobj={errors}
              />
              <FormInput
                name="phonenumber"
                label="Phone Number"
                required
                errorobj={errors}
              />
            </Stack>
            <Stack isVertical className={styles.stack}>
              <FormInput
                name="password"
                label="Password"
                required
                errorobj={errors}
              />
              <FormInput
                name="passwordconfirmation"
                label="Confirm Password"
                required
                errorobj={errors}
              />
            </Stack>
          </FormProvider>
          <Stack spacing="medium" fill>
            <Button
              intent={notificationType === 'email' ? 'primary' : ''}
              onClick={() => setNotificationType('email')}
              text="Send confirmation via email?"
              isFullWidth
            />
            <Button
              intent={notificationType === 'text' ? 'primary' : ''}
              onClick={() => setNotificationType('text')}
              text="Send confirmation via text?"
              isFullWidth
            />
          </Stack>
          <Stack isVertical spacing="medium">
            <Button
              intent="primary"
              onClick={handleSubmit(onSubmit)}
              text="Register"
              isFullWidth
            />
            <Button href="/account/login" text="Cancel" isFullWidth />
          </Stack>
        </Card>
      </div>
    </Page>
  );
};

export default Register;
