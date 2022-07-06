import { yupResolver } from '@hookform/resolvers';
import {
  Button, Card, Stack, Text,
} from 'app/components/elements';
import FormInput from 'app/components/molecules/dashboard/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { retrieveSignInFunction, retrieveUserByObjectId } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from './index.module.scss';

const validationSchema = yup.object().shape({
  firstname: yup.string().required('First Name is Required'),
  lastname: yup.string().required('Last Name is Required'),
  username: yup.string().required('Username or Phone Number is Required'),
  email: yup.string().required('Email is Required'),
  organization: yup.string().required('Username or Phone Number is Required'),
  password: yup.string().required('Password is Required'),
});

const Reset = () => {
  const router =  useRouter()
  const methods =  useForm({
    resolver: yupResolver(validationSchema),
  });

  const { objectId:userId } = router.query;

  const { handleSubmit, errors } = methods

  const [user, setUser] = useState()

  const returnHome = () => {
    router.push('/')
  }

  useEffect(() => {
    const retrieveAccountDetails = async () => {
      const user = await retrieveUserByObjectId(userId);

      setUser({
        "First Name": user.attributes.firstname,
        "Last Name":user. attributes.lastname, 
        "Username": user.attributes.username,
        "Organization": user.attributes.organization,
        "Phone Number": user.attributes.phonenumber,
        "Email Address": "",
        'Password': "",
      })
    }  
    if (!userId) return
    retrieveAccountDetails()
  },[userId])

  const onSubmit = (data) => {
    const { username, password } = data;
    return retrieveSignInFunction(username, password)
      .then(() => {
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
            <Text text="Account Details" element="h2" />
          </Stack>
          <FormProvider {...methods}>
            <Stack
              isVertical
              spacing="large"
              className={styles.stack}
            >
              {user && Object.keys(user).map(attr =>
                <FormInput
                defaultValue={user[attr]}
                name={attr}
                label={attr}
                required
                errorobj={errors}
                InputProps={{
                  startAdornment: <span position="start" />,
                }}
              />
              )}
              {/* <FormInput
                name="username"
                label="Phone Number or Email Address"
                required
                errorobj={errors}
                InputProps={{
                  startAdornment: <span position="start" />,
                }}
              />
              <FormInput
                name="password"
                label="Password"
                required
                errorobj={errors}
                InputProps={{
                  startAdornment: <span position="start" />,
                }}
              />  */}
            </Stack>
          </FormProvider>
          <Stack isVertical spacing="large">
            <Button
              text="Continue"
              onClick={handleSubmit(onSubmit)}
              isFullWidth
            />
          </Stack>
        </Card>
      </div>
    </Page>
  );
};

export default Reset;

