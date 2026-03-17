/* eslint-disable react/prop-types */ // TODO: upgrade to latest eslint tooling

import { yupResolver } from '@hookform/resolvers'
import { Button, Card, Page, Spinner, Stack, Text } from 'app/impacto-design-system'
import {
    retrieveSignInFunction,
    retrieveUserByObjectId,
    updateUser,
} from 'app/modules/user'
import { useRouter } from 'next/router'
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
    <Page header footer>
      <div className={styles.paper}>
        {loading ? (
          <div className={styles.loadingState}>
            <Spinner />
          </div>
        ) : (
        <Card padding="extraLarge">
          <Text text="PUENTE" element="h1" className={styles.stack} />
          <Stack isVertical className={styles.stack}>
            <Text text="Account Details" element="h2" />
          </Stack>
          <Text text="Account Active" element="h6" />
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
    </Page>
  )
}

function ManagementWrapper() {
  const router = useRouter()
  const [user, setUser] = useState()
  const [userId, setUserID] = useState()
  const { objectId } = router.query

  const retrieveUser = async () => {
    const { attributes: retrievedUser } = await retrieveUserByObjectId(objectId)
    return retrievedUser
  }

  useEffect(() => {
    const retrieveAccountDetails = async () => {
      const retrievedUser = await retrieveUser()
      setUserID(objectId)
      setUser({
        'First Name': retrievedUser.firstname,
        'Last Name': retrievedUser.lastname,
        Organization: retrievedUser.organization,
        'Phone Number': retrievedUser.phonenumber,
        'Email Address': retrievedUser.email,
        Password: '',
      })
    }
    if (!objectId) return
    retrieveAccountDetails()
  }, [objectId])

  return <Management user={user} userId={userId} router={router} loading={!user} />
}

export default ManagementWrapper
