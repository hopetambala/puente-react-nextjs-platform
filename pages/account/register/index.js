import { yupResolver } from '@hookform/resolvers';
import {
    Button,
    FormInput,
    Stack,
    Text,
    Toast,
} from 'app/impacto-design-system';
import FormSelectAutoComplete from 'app/impacto-design-system/form-controls/select-autocomplete';
import { loadOrganizations, selectedOrganizationName } from 'app/modules/organization';
import { retrieveSignUpFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import styles from './index.module.scss';

const HELP_ID = 'organization-not-listed-help';

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

function Register() {
  const router = useRouter();
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });
  const [notificationType, setNotificationType] = useState('email');
  // `unavailable` starts false so the picker renders immediately; a failed load
  // flips it. Never conflate "could not load" with "no organizations exist" —
  // both look like an empty dropdown, and only one is the user's problem.
  const [organizations, setOrganizations] = useState({ options: [], unavailable: false });
  const [orgNotListedOpen, setOrgNotListedOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    loadOrganizations(Parse).then((result) => {
      if (!ignore) setOrganizations(result);
    });
    return () => { ignore = true; };
  }, []);

  const { handleSubmit, errors } = methods;

  const onSubmit = async (user) => {
    // The picker yields a react-select option object; signup stores
    // String(organization), so an object lands as "[object Object]".
    const payload = {
      ...user,
      organization: selectedOrganizationName(user.organization),
    };
    await retrieveSignUpFunction(payload, notificationType).then(() => {
      router.push('/quick-start');
    }).catch((e) => toast(
      <Toast text={`${e.message}`} isError />,
    ));
  };

  return (
    <div className={styles.auth}>
      {/* ── left column: brand ── */}
      <div className={styles.left} data-testid="auth-brand">
        <div className={styles.leftBrand}>
          <div className={styles.leftBrandMark}>P</div>
          <span className={styles.leftBrandName}>Puente</span>
        </div>
      </div>

      {/* ── right column: form ── */}
      <div className={styles.right} data-testid="auth-form">
        <div className={styles.card}>
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
              {organizations.unavailable ? (
                // Text takes a fixed prop list and does not forward data-* or
                // arbitrary attributes, so the test hook lives on the wrapper.
                <div data-testid="organization-unavailable">
                  <Text
                    element="p"
                    color="red"
                    text="We could not load the list of organizations. Check your connection and reload the page."
                  />
                </div>
              ) : (
                <>
                  <FormSelectAutoComplete
                    name="organization"
                    label="Organization"
                    required
                    options={organizations.options}
                    errorobj={errors}
                  />
                  {/* Only offered when the list actually loaded. If it did not,
                      we cannot claim an organization is missing from it. */}
                  <button
                    type="button"
                    className={styles.notListed}
                    onClick={() => setOrgNotListedOpen((open) => !open)}
                    aria-expanded={orgNotListedOpen}
                    aria-controls={orgNotListedOpen ? HELP_ID : undefined}
                  >
                    My organization isn&apos;t listed
                  </button>
                  {orgNotListedOpen && (
                    <div
                      id={HELP_ID}
                      className={styles.notListedHelp}
                      data-testid="organization-not-listed-help"
                    >
                      Puente staff add organizations by hand, which is what
                      keeps the list worth trusting. Email
                      {' '}
                      <a href="mailto:info@puente-dr.org?subject=Add%20my%20organization%20to%20Puente%20Manage">
                        info@puente-dr.org
                      </a>
                      {' '}
                      with your organization&apos;s name. Once it appears in the
                      list you can finish registering.
                    </div>
                  )}
                </>
              )}
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
            <Button
              href="/account/login"
              text="Cancel"
              isFullWidth
            />
          </Stack>
        </div>
      </div>
    </div>
  );
}

export default Register;
