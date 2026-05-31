import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@hookform/resolvers', () => ({
  yupResolver: jest.fn(() => jest.fn()),
}));

jest.mock('yup', () => ({
  object: () => ({ shape: () => ({ required: () => ({}) }) }),
  string: () => ({ required: () => ({}) }),
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: {} })),
}));

jest.mock('app/modules/user', () => ({
  retrieveSignInFunction: jest.fn(),
  retrieveUserByObjectId: jest.fn().mockResolvedValue({ attributes: {} }),
  updateUser: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-hook-form', () => ({
  FormProvider: ({ children }) => <>{children}</>,
  useForm: () => ({
    handleSubmit: (fn) => fn,
    register: jest.fn(),
    reset: jest.fn(),
    errors: {},
  }),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Page: ({ children }) => <div data-testid="page">{children}</div>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text }) => <span>{text}</span>,
  FormInput: ({ name, label }) => <input aria-label={label || name} name={name} />,
}));

const Reset = require('pages/account/reset/index').default;

describe('Phase 8 — Reset page redesign', () => {
  it('renders data-testid="auth-brand" (brand column)', () => {
    render(<Reset />);
    expect(screen.getByTestId('auth-brand')).toBeInTheDocument();
  });

  it('renders data-testid="auth-form" (form column)', () => {
    render(<Reset />);
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
  });

  it('does NOT call window.localStorage.clear on mount', () => {
    const clearSpy = jest.spyOn(window.localStorage.__proto__, 'clear');
    render(<Reset />);
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
