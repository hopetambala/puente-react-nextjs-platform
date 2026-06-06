import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@hookform/resolvers', () => ({
  yupResolver: jest.fn(() => jest.fn()),
}));

jest.mock('yup', () => {
  const chain = () => ({ required: chain, email: chain, matches: chain, string: chain, oneOf: chain, ref: jest.fn(), object: chain, shape: chain });
  return { object: () => ({ shape: () => ({}) }), string: chain, ref: jest.fn() };
});

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: {} })),
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      register_title: 'Nice to meet you',
      register_subtitle: 'Create your account',
      register_already: 'Already have an account?',
      sign_in: 'Sign in →',
    }[key] ?? key),
  }),
}));

jest.mock('app/modules/user', () => ({
  retrieveSignUpFunction: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-hook-form', () => ({
  FormProvider: ({ children }) => <>{children}</>,
  useForm: () => ({
    handleSubmit: (fn) => fn,
    register: jest.fn(),
    errors: {},
  }),
}));

jest.mock('react-toastify', () => ({ toast: jest.fn() }));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  FormInput: ({ name, label }) => <input aria-label={label || name} name={name} />,
  Page: ({ children }) => <div data-testid="page">{children}</div>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text }) => <span>{text}</span>,
  Toast: () => null,
}));

const Register = require('pages/account/register/index').default;

describe('Phase 8 — Register page redesign', () => {
  it('renders data-testid="auth-brand" (brand column)', () => {
    render(<Register />);
    expect(screen.getByTestId('auth-brand')).toBeInTheDocument();
  });

  it('renders data-testid="auth-form" (form column)', () => {
    render(<Register />);
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
  });
});
