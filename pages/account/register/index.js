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
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import styles from './index.module.scss';

const HELP_ID = 'organization-not-listed-help';

const phoneRegExp = /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

/**
 * Built from `t` rather than at module scope, so validation messages are
 * translated like everything else on the page.
 *
 * Safe to rebuild on a locale change: react-hook-form 6.15.8 refreshes
 * `resolverRef.current` on every render (dist/index.cjs.development.js:716), so
 * a new resolver is picked up rather than the first render's being cached.
 */
export function buildRegisterSchema(t) {
  return yup.object().shape({
    firstname: yup.string(),
    lastname: yup.string(),
    organization: yup.string().required(t('register_error_organization')),
    email: yup.string()
      .email(t('register_error_email_invalid'))
      .required(t('register_error_email_required')),
    // This read 'Password is required' — a copy-paste that told people their
    // phone number was a password. Nothing tested the schema, so nothing caught it.
    phonenumber: yup.string().matches(phoneRegExp, t('register_error_phone')),
    password: yup.string().required(t('register_error_password')),
    passwordconfirmation: yup.string()
      .oneOf([yup.ref('password'), null], t('register_error_password_match')),
  });
}

function Register() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const validationSchema = useMemo(() => buildRegisterSchema(t), [t]);
  const methods = useForm({
    resolver: yupResolver(validationSchema),
  });
  // Confirmation is email only. SMS is no longer supported, and offering a
  // control that cannot work is worse than offering none - someone picks it,
  // registers, and waits for a text that never arrives. Kept as a named
  // constant rather than inlined so the signup contract still reads clearly.
  const notificationType = 'email';
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
          {/* Brand mark and product name — not copy, never translated. */}
          <div className={styles.leftBrandMark}>P</div>
          <span className={styles.leftBrandName}>Puente</span>
        </div>
      </div>

      {/* ── right column: form ── */}
      <div className={styles.right} data-testid="auth-form">
        <div className={styles.card}>
          <Stack isVertical spacing="medium">
            <Text text={t('register_heading')} element="h2" />
            <Text text={t('register_required_note')} element="p" />
          </Stack>
          <FormProvider {...methods}>
            <Stack isVertical className={styles.stack}>
              <FormInput
                name="firstname"
                label={t('register_field_first_name')}
                errorobj={errors}
              />
              <FormInput
                name="lastname"
                label={t('register_field_last_name')}
                errorobj={errors}
              />
              {organizations.unavailable ? (
                // Text takes a fixed prop list and does not forward data-* or
                // arbitrary attributes, so the test hook lives on the wrapper.
                <div data-testid="organization-unavailable">
                  <Text
                    element="p"
                    color="red"
                    text={t('register_org_unavailable')}
                  />
                </div>
              ) : (
                <>
                  <FormSelectAutoComplete
                    name="organization"
                    label={t('register_field_organization')}
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
                    {t('register_org_not_listed')}
                  </button>
                  {orgNotListedOpen && (
                    <div
                      id={HELP_ID}
                      className={styles.notListedHelp}
                      data-testid="organization-not-listed-help"
                    >
                      {t('register_org_help')}
                      {' '}
                      {/* The link goes last rather than mid-sentence: splitting a
                          sentence around an anchor forces translators into
                          English word order. */}
                      <a href="mailto:info@puente-dr.org?subject=Add%20my%20organization%20to%20Puente%20Manage">
                        {t('register_org_help_cta')}
                      </a>
                    </div>
                  )}
                </>
              )}
              <FormInput
                name="email"
                label={t('register_field_email')}
                required
                errorobj={errors}
              />
              {/* NOT required, and the schema agrees - the asterisk claimed
                  otherwise while yup only pattern-matched it. Phone is contact
                  information, not identity: it is shared between colleagues and
                  reassigned when someone leaves, which is exactly why it stopped
                  being the username. */}
              <FormInput
                name="phonenumber"
                label={t('register_field_phone')}
                errorobj={errors}
              />
            </Stack>
            <Stack isVertical className={styles.stack}>
              {/* type="password" so the browser masks the value and offers to
                  save it. Without it these rendered as plain text: a password
                  visible on screen to anyone nearby — which in a shared field
                  office is most people — and invisible to password managers.
                  The sign-in form already did this correctly; registration did
                  not, and nothing compared them. Caught by e2e/suites/sign-up. */}
              <FormInput
                name="password"
                type="password"
                label={t('register_field_password')}
                required
                errorobj={errors}
              />
              <FormInput
                name="passwordconfirmation"
                type="password"
                label={t('register_field_password_confirm')}
                required
                errorobj={errors}
              />
            </Stack>
          </FormProvider>
          <Stack isVertical spacing="medium">
            <Button
              intent="primary"
              onClick={handleSubmit(onSubmit)}
              text={t('register_submit')}
              isFullWidth
            />
            <Button
              href="/account/login"
              text={t('register_cancel')}
              isFullWidth
            />
          </Stack>
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default Register;
