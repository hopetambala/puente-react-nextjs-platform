import { yupResolver } from '@hookform/resolvers';
import {
  Avatar, Button, Grid, Paper,
} from '@material-ui/core';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import { Link } from 'app/components/elements';
import FormInput from 'app/components/molecules/dashboard/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { UserContext } from 'app/store/auth.context';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
// import { alertService, userService } from 'services';
import * as yup from 'yup';

const phoneRegExp = /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

const validationSchema = yup.object().shape({
  firstname: yup.string().required('First Name is re'),
  lastname: yup.string().required('Last Name is required'),
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
  const {
    register, error: userError,
  } = useContext(UserContext);

  const { handleSubmit, errors } = methods;

  const onSubmit = (user) => register(user)
    .then(() => router.push('/quick-start'))
    .catch(() => console.log(userError)); //eslint-disable-line

  const paperStyle = {
    padding: 20, height: '70vh', width: '50vw', margin: '20px auto',
  };

  const avatarStyle = { backgroundColor: '#1bbd7e' };

  return (
    <Page>
      <Grid>
        <Paper elevation={10} style={paperStyle}>
          <Grid align="center">
            <Avatar style={avatarStyle}><LockOutlinedIcon /></Avatar>
            <h2>Registration</h2>
          </Grid>
          <FormProvider {...methods}>
            <form>
              <Grid container spacing={4}>
                <Grid item>
                  <FormInput
                    name="firstname"
                    label="First Name"
                    required
                    errorobj={errors}
                  />
                  <FormInput
                    name="lastname"
                    label="Last Name"
                    required
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
                </Grid>
                <Grid item>
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
                </Grid>
              </Grid>
            </form>
          </FormProvider>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit(onSubmit)}
          >
            Register
          </Button>
          <Link href="/account/login">
            <Button
              color="primary"
            >
              Cancel
            </Button>
          </Link>
        </Paper>
      </Grid>
    </Page>
  );
};

export default Register;
