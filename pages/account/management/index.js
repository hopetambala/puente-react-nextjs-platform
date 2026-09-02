/* eslint-disable react/prop-types */ // TODO: upgrade to latest eslint tooling

import { yupResolver } from '@hookform/resolvers'
import { AppShell, Button, Card, LanguageSwitcher, PageHeader, Spinner, Stack } from 'app/impacto-design-system'
import {
    retrieveCurrentUserAsyncFunction,
    retrieveSignInFunction,
    retrieveUserByObjectId,
    updateUser,
} from 'app/modules/user'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
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
    Password: yup.string(),
  })
  .required()

function Management(props) {
  const { t } = useTranslation('common');
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
      // From the loaded profile, not the form: organization is not editable
      // here, and reading data.Organization would submit undefined and wipe it.
      organization: user.Organization,
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
      // From the loaded profile, not the form: organization is not editable
      // here, and reading data.Organization would submit undefined and wipe it.
      organization: user.Organization,
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
    <AppShell breadcrumb={[t('breadcrumb_settings')]}>
      <PageHeader
        title={t('account_settings_title')}
        sub={t('account_settings_sub')}
      />
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
                    attr === 'Organization' ? (
                      /* Read-only on purpose. Organization is the tenancy and
                         billing principal — a free-text box here let anyone move
                         themselves into another organization and see its data,
                         and a picker would only make the destinations easier to
                         find. Changing it is a staff action. */
                      <Stack isVertical fill>
                        <label htmlFor={attr}>{attr}</label>
                        <p className={styles.readOnlyValue}>{user[attr]}</p>
                        <p
                          className={styles.readOnlyNote}
                          data-testid="organization-change-note"
                        >
                          Your organization determines which records you can see.
                          Email info@puente-dr.org to change it.
                        </p>
                      </Stack>
                    ) : (
                    <Stack isVertical fill>
                      <label htmlFor={attr}>{attr}</label>
                      <input name={attr} ref={register} />
                      {errors[`${attr}`]?.message && (
                        <p className={styles.errorText}>
                          {errors[`${attr}`]?.message}
                        </p>
                      )}
                    </Stack>
                    )
                  ))}
              </Stack>
              <Stack isVertical spacing="large">
                <Button
                  intent="primary"
                  text={t('account_update_user')}
                  onClick={handleSubmit(onSubmit)}
                  isFullWidth
                />
                <Button
                  intent="danger"
                  text={t('account_delete_user')}
                  onClick={handleSubmit(onDelete)}
                  isFullWidth
                />
              </Stack>
            </form>
          </FormProvider>
        </Card>
        )}

        {/* Deliberately outside the FormProvider: that form is yup-validated,
            submits, re-authenticates and redirects, and language is not a
            _User field. Also outside the loading ternary, so the choice stays
            available while the profile is still fetching. */}
        <Card padding="medium">
          <LanguageSwitcher />
        </Card>
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
