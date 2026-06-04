/* eslint-disable react/prop-types */ // TODO: upgrade to latest eslint tooling

import { yupResolver } from '@hookform/resolvers'
import { AppShell, Button, Card, PageHeader, Spinner, Stack } from 'app/impacto-design-system'
import {
    retrieveCurrentUserAsyncFunction,
    retrieveSignInFunction,
    retrieveUserByObjectId,
    updateUser,
} from 'app/modules/user'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import * as yup from 'yup'

import styles from './index.module.scss'

const validationSchema = yup
  .object()
  .shape({
    'First Name': yup.string().required('First Name is Required'),
    'Last Name': yup.string().required('Last Name is Required'),
    'Email Address': yup.string().required('Email is Required'),
    Organization: yup.string().required('Username or Phone Number is Required'),
    Password: yup.string(),
  })
  .required()

function Management(props) {
  const { user, userId, router, loading } = props
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  })

  const { register, reset, handleSubmit, errors } = methods

  useEffect(() => {
    reset(user)
  }, [user])

  const onSubmit = async (data) => {
    const updatedUser = {
      firstname: data['First Name'],
      lastname: data['Last Name'],
      organization: data.Organization,
      phonenumber: data['Phone Number'],
      email: data['Email Address'],
    }

    if (data?.Password) updatedUser.password = data.Password

    await updateUser(userId, updatedUser).then(async (userResp) => {
      const { username, password } = userResp
      await retrieveSignInFunction(username, password)
      const returnUrl = '/quick-start'
      router.push(returnUrl)
    })
  }

  const onDelete = async (data) => {
    const updatedUser = {
      firstname: data['First Name'],
      lastname: data['Last Name'],
      organization: data.Organization,
      phonenumber: data['Phone Number'],
      email: data['Email Address'],
      password: data.Password,
      active: false,
    }

    return updateUser(userId, updatedUser).then(() =>
      router.push('/account/login')
    )
  }

  return (
    <AppShell breadcrumb={['Settings']}>
      <PageHeader title="Account Settings" sub="Manage your profile, credentials, and account preferences." />
      <div className={styles.paper}>
        {loading ? (
          <div className={styles.loadingState}>
            <Spinner />
          </div>
        ) : (
        <Card padding="extraLarge">
          <FormProvider {...methods}>
            <form>
              <Stack isVertical spacing="large" className={styles.stack} fill>
                {user &&
                  Object.keys(user).map((attr) => (
                    <Stack isVertical fill>
                      <label htmlFor={attr}>{attr}</label>
                      <input name={attr} ref={register} />
                      {errors[`${attr}`]?.message && (
                        <p className={styles.errorText}>
                          {errors[`${attr}`]?.message}
                        </p>
                      )}
                    </Stack>
                  ))}
              </Stack>
              <Stack isVertical spacing="large">
                <Button
                  intent="primary"
                  text="Update user"
                  onClick={handleSubmit(onSubmit)}
                  isFullWidth
                />
                <Button
                  intent="danger"
                  text="Delete user"
                  onClick={handleSubmit(onDelete)}
                  isFullWidth
                />
              </Stack>
            </form>
          </FormProvider>
        </Card>
        )}
      </div>
    </AppShell>
  )
}

function ManagementWrapper() {
  const router = useRouter()
  const [user, setUser] = useState()
  const [userId, setUserID] = useState()
  const { objectId } = router.query

  useEffect(() => {
    const retrieveAccountDetails = async () => {
      // Use URL param objectId if present, otherwise fall back to current user
      let targetId = objectId
      if (!targetId) {
        const currentUser = retrieveCurrentUserAsyncFunction()
        if (!currentUser) {
          // Public route opened with no objectId and no signed-in user — send to
          // login instead of spinning forever.
          router.push('/account/login')
          return
        }
        targetId = currentUser.id
      }
      const { attributes: retrievedUser } = await retrieveUserByObjectId(targetId)
      setUserID(targetId)
      setUser({
        'First Name': retrievedUser.firstname,
        'Last Name': retrievedUser.lastname,
        Organization: retrievedUser.organization,
        'Phone Number': retrievedUser.phonenumber,
        'Email Address': retrievedUser.email,
        Password: '',
      })
    }
    retrieveAccountDetails()
  }, [objectId])

  return <Management user={user} userId={userId} router={router} loading={!user} />
}

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } }
}

export default ManagementWrapper
