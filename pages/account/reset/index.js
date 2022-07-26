import { yupResolver } from '@hookform/resolvers';
import {
  Button, Card, Stack, Text,
} from 'app/components/elements';
import FormInput from 'app/components/molecules/dashboard/form-controls/input';
import Page from 'app/components/templates/dashboard-layout';
import { retrieveSignInFunction, retrieveUserByObjectId, updateUser } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
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

const Reset = (props) => {
  const { user, userId, router } = props;
  const methods = useForm({
    defaultValues: useMemo(() => user, [props]),
    resolver: yupResolver(validationSchema),
  });

  const {
    register, reset, handleSubmit, errors,
  } = methods;

  useEffect(() => {
    reset(user);
  }, [user]);

  const onSubmit = async (data) => {
    const updatedUser = {
      firstname: data['First Name'],
      lastname: data['Last Name'],
      organization: data.Organization,
      phonenumber: data['Phone Number'],
      email: data['Email Address'],
      password: data.Password,
    };
    await updateUser(userId, updatedUser).then(async (userResp) => {
      const { username, password } = userResp;
      await retrieveSignInFunction(username, password);
      const returnUrl = '/quick-start';
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
              {user && Object.keys(user).map((attr) => (
                <div>
                  <label htmlFor={attr}>{attr}</label>
                  <input name={attr} ref={register} />
                </div>
              ))}
            </Stack>
            <Stack isVertical spacing="large">
              <Button
                text="Continue"
                onClick={handleSubmit(onSubmit)}
                isFullWidth
                type="submit"
              />
            </Stack>
          </FormProvider>
        </Card>
      </div>
    </Page>
  );
};

const ResetWrapper = () => {
  const router = useRouter();
  const { objectId: userId } = router.query;
  const [user, setUser] = useState();
  window.localStorage.clear();
  useEffect(() => {
    // http://localhost:3000/account/reset?objectId=AyplFWVebA
    const retrieveAccountDetails = async () => {
      const { attributes: retrievedUser } = await retrieveUserByObjectId(userId);
      setUser(retrievedUser);
      setUser({
        'First Name': retrievedUser.firstname,
        'Last Name': retrievedUser.lastname,
        Username: retrievedUser.username,
        Organization: retrievedUser.organization,
        'Phone Number': retrievedUser.phonenumber,
        'Email Address': retrievedUser.email,
        Password: '',
      });
    };
    if (!userId) return;
    retrieveAccountDetails();
  }, [userId]);

  return <Reset user={user} userId={userId} router={router} />;
};

export default ResetWrapper;
