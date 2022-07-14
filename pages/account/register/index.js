import { yupResolver } from '@hookform/resolvers';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import { Card, Link, Stack, Text, Button } from 'app/components/elements';
import FormInput from 'app/components/molecules/dashboard/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { retrieveSignUpFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { FormProvider, useForm } from 'react-hook-form';
import styles from './index.module.scss';
import * as yup from 'yup';

const phoneRegExp = /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

const validationSchema = yup.object().shape({
  firstname: yup.string(),
  lastname: yup.string(),
  organization: yup.string().required('Organization Name is required'),
  email: yup.string().email('Invalid email format').required('Email Address is required'),
  phonenumber: yup.string().matches(phoneRegExp, 'Password is required'),
  password: yup.string().required('Password is required'),
  passwordconfirmation: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match'),
});

const Register = () => {
  const router = useRouter();
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });

  const { handleSubmit, errors } = methods;

  const onSubmit = (user) => retrieveSignUpFunction(user)
    .then(() => {
      router.push('/quick-start');
    });

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
              <FormInput
                name="lastname"
                label="Last Name"
                errorobj={errors}
              />
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
          <Stack isVertical spacing='medium'>
            <Button
              intent="primary"
              onClick={handleSubmit(onSubmit)}
              text="Register"
              isFullWidth
            />
            <Button
              href="/account/login"
              text="Cancel"
              isFullWidth
            />
          </Stack>
        </Card>
      </div>
    </Page>
  );
};

export default Register;
