import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

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

jest.mock('parse', () => ({ Parse: {} }));

// Defaults to a successful empty load so tests that are not about the picker
// (the Phase 8 layout tests) do not have to stub it.
const mockLoad = jest.fn().mockResolvedValue({ options: [], unavailable: false });
jest.mock('app/modules/organization', () => ({
  loadOrganizations: (...a) => mockLoad(...a),
}));

jest.mock('app/impacto-design-system/form-controls/select-autocomplete', () => ({
  __esModule: true,
  default: ({ name, label, options }) => (
    <div data-testid={`picker-${name}`} aria-label={label}>
      {(options || []).map((o) => <span key={o.id}>{o.label}</span>)}
    </div>
  ),
}));

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

const ORGS = [
  { id: 'a', label: 'Cevicos', shortCode: 'cevicos' },
  { id: 'b', label: 'Puente', shortCode: 'puente' },
];

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

describe('organization picker', () => {
  beforeEach(() => mockLoad.mockReset()
    .mockResolvedValue({ options: [], unavailable: false }));

  it('offers a picker of loaded organizations, not a free-text field', async () => {
    // The free-text field is the origin of the whole problem: 82 distinct
    // organization strings in production, and a user who types "puente" sees an
    // empty app with no error.
    mockLoad.mockResolvedValue({ options: ORGS, unavailable: false });

    render(<Register />);

    const picker = await screen.findByTestId('picker-organization');
    // Scoped to the picker: "Puente" is also the brand name in the left column.
    expect(within(picker).getByText('Cevicos')).toBeInTheDocument();
    expect(within(picker).getByText('Puente')).toBeInTheDocument();
  });

  it('says the list could not load rather than showing an empty picker', async () => {
    // An empty dropdown because nothing loaded looks identical to one because no
    // organizations exist. The person must be told which it is.
    mockLoad.mockResolvedValue({ options: [], unavailable: true });

    render(<Register />);

    expect(await screen.findByTestId('organization-unavailable')).toBeInTheDocument();
  });

  it('does not claim unavailable when the list is genuinely empty', async () => {
    mockLoad.mockResolvedValue({ options: [], unavailable: false });

    render(<Register />);

    await screen.findByTestId('picker-organization');
    expect(screen.queryByTestId('organization-unavailable')).not.toBeInTheDocument();
  });
});
