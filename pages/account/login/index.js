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

const validationSchema = yup.object().shape({
  usernameV: yup.string().required('Username or Phone Number is Required'),
  passwordV: yup.string().required('Password is Required'),
});

const Login = () => {
  const router = useRouter();
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });

  const {
    login, error: userError,
  } = useContext(UserContext);

  const { handleSubmit, errors } = methods;

  const onSubmit = async (data) => {
    const { usernameV, passwordV } = data;
    return login({ usernameV, passwordV })
      .then(() => {
        // get return url from query parameters or default to '/'
        const returnUrl = router.query.returnUrl || '/quick-start';
        router.push(returnUrl);
      }).catch(() => {
        console.log(userError); //eslint-disable-line
      });
  };

  const paperStyle = {
    padding: 20, height: '70vh', width: '50vw', margin: '20px auto',
  };

  const avatarStyle = { backgroundColor: 'black' };
  return (
    <Page>
      <Grid>
        <Paper elevation={10} style={paperStyle}>
          <Grid align="center">
            <Avatar style={avatarStyle}><LockOutlinedIcon /></Avatar>
            <h2>Login</h2>
          </Grid>
          <FormProvider {...methods}>
            <form>
              <Grid>
                <Grid item>
                  <FormInput
                    name="usernameV"
                    label="Phone Number or Email Address"
                    required
                    errorobj={errors}
                  />
                  <FormInput
                    name="passwordV"
                    label="Password"
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
            Login
          </Button>
          <Link href="/account/register">
            <Button
              variant="contained"
              color="primary"
            >
              Register
            </Button>
          </Link>
        </Paper>
      </Grid>
    </Page>
  );
};

export default Login;
