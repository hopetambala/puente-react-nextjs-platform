import '@testing-library/jest-dom';

// Deliberately NO yup mock here — index.test.js stubs yup wholesale, which is
// why the schema's messages were never covered by anything and how the phone
// field ended up telling people "Password is required".
const { buildRegisterSchema } = require('pages/account/register/index');

// Returns the key so a message that is still a hardcoded literal fails loudly.
const t = (key) => `T:${key}`;

describe('register validation messages', () => {
  const cases = [
    ['organization', {}, 'T:register_error_organization'],
    ['email', { email: 'not-an-email' }, 'T:register_error_email_invalid'],
    ['password', {}, 'T:register_error_password'],
    ['phonenumber', { phonenumber: 'abc' }, 'T:register_error_phone'],
  ];

  it.each(cases)('translates the %s message', async (field, value, expected) => {
    await expect(buildRegisterSchema(t).validateAt(field, value))
      .rejects.toThrow(expected);
  });

  it('does not tell someone their phone number is a password', async () => {
    // The literal bug: phonenumber carried 'Password is required'.
    await expect(buildRegisterSchema(t).validateAt('phonenumber', { phonenumber: 'abc' }))
      .rejects.not.toThrow(/password/i);
  });
});
