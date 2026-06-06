/* eslint-disable react/prop-types */ // TODO: upgrade to latest eslint tooling

import { yupResolver } from '@hookform/resolvers'
import { Button, Stack, Text } from 'app/impacto-design-system'
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
    Password: yup.string().required('Password is Required'),
  })
  .required()

function Reset(props) {
  const { user, userId, router } = props
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
      password: data.Password,
    }
    await updateUser(userId, updatedUser).then(async (userResp) => {
      const { username, password } = userResp
      await retrieveSignInFunction(username, password)
      const returnUrl = '/quick-start'
      router.push(returnUrl)
    })
  }

  return (
    <div className={styles.auth}>
      <div className={styles.left} data-testid="auth-brand">
        <div className={styles.leftBrand}>
          <div className={styles.leftBrandMark}>P</div>
          <span className={styles.leftBrandName}>Puente</span>
        </div>
      </div>
      <div className={styles.right} data-testid="auth-form">
        <div className={styles.paper}>
          <Text text="PUENTE" element="h1" className={styles.stack} />
          <Stack isVertical className={styles.stack}>
            <Text text="Account Details" element="h2" />
          </Stack>
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
                  text="Continue"
                  onClick={handleSubmit(onSubmit)}
                  isFullWidth
                />
              </Stack>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  )
}

function ResetWrapper() {
  const router = useRouter()
  const { objectId: userId } = router.query
  const [user, setUser] = useState()
  useEffect(() => {
    // http://localhost:3000/account/reset?objectId=AyplFWVebA
    const retrieveAccountDetails = async () => {
      const { attributes: retrievedUser } = await retrieveUserByObjectId(userId)
      setUser(retrievedUser)
      setUser({
        'First Name': retrievedUser.firstname,
        'Last Name': retrievedUser.lastname,
        // Username: retrievedUser.username,
        Organization: retrievedUser.organization,
        'Phone Number': retrievedUser.phonenumber,
        'Email Address': retrievedUser.email,
        Password: '',
      })
    }
    if (!userId) return
    retrieveAccountDetails()
  }, [userId])

  return <Reset user={user} userId={userId} router={router} />
}

export default ResetWrapper
