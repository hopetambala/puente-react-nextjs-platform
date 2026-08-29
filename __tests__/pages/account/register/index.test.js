import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

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

// Holds what the form would hand onSubmit. react-select gives react-hook-form
// the whole selected OPTION OBJECT, not a bare value, so tests can set that
// shape here to exercise the real submit boundary.
let mockFormValues = {};
jest.mock('react-hook-form', () => ({
  FormProvider: ({ children }) => <>{children}</>,
  useForm: () => ({
    handleSubmit: (fn) => () => fn(mockFormValues),
    register: jest.fn(),
    errors: {},
  }),
}));

jest.mock('react-toastify', () => ({ toast: jest.fn() }));

jest.mock('parse', () => ({ Parse: {} }));

// Defaults to a successful empty load so tests that are not about the picker
// (the Phase 8 layout tests) do not have to stub it.
const mockLoad = jest.fn().mockResolvedValue({ options: [], unavailable: false });
// Only loadOrganizations is stubbed. selectedOrganizationName stays REAL — it
// is the thing under test at the submit boundary, and mocking the whole module
// is what hid this bug in the first place.
jest.mock('app/modules/organization', () => ({
  ...jest.requireActual('app/modules/organization'),
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

describe('"my organization isn\'t listed"', () => {
  beforeEach(() => mockLoad.mockReset()
    .mockResolvedValue({ options: ORGS, unavailable: false }));

  it('offers a way forward when the organization is missing from the list', async () => {
    // Without this, replacing free text with a picker trades one failure for
    // another: a user whose organization was never created simply cannot
    // register, and the page gives them no idea why or what to do.
    render(<Register />);
    await screen.findByTestId('picker-organization');

    expect(
      screen.getByRole('button', { name: /organization isn't listed/i }),
    ).toBeInTheDocument();
  });
});

describe('the missing-organization escape hatch', () => {
  beforeEach(() => mockLoad.mockReset()
    .mockResolvedValue({ options: ORGS, unavailable: false }));

  it('routes the request to a human instead of a dead end', async () => {
    // Organizations are created by Puente staff by hand. So the honest answer
    // is a contact route, not a form field — and the page has to say so, or a
    // blocked user has no idea the path exists.
    render(<Register />);
    await screen.findByTestId('picker-organization');

    fireEvent.click(screen.getByRole('button', { name: /organization isn't listed/i }));

    const help = await screen.findByTestId('organization-not-listed-help');
    expect(within(help).getByRole('link', { name: /info@puente-dr\.org/i }))
      .toHaveAttribute('href', expect.stringContaining('mailto:info@puente-dr.org'));
  });
});

describe('the escape hatch as an accessible disclosure', () => {
  beforeEach(() => mockLoad.mockReset()
    .mockResolvedValue({ options: ORGS, unavailable: false }));

  it('reports its expanded state and can be closed again', async () => {
    // A screen-reader user is told nothing by a button that silently reveals
    // text below it, and a one-way disclosure leaves the help wedged open
    // between the picker and the rest of the form.
    render(<Register />);
    await screen.findByTestId('picker-organization');

    const toggle = screen.getByRole('button', { name: /organization isn't listed/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(screen.queryByTestId('organization-not-listed-help')).not.toBeInTheDocument();
  });
});

describe('what the picker actually submits', () => {
  const { retrieveSignUpFunction } = require('app/modules/user');

  beforeEach(() => {
    mockLoad.mockReset().mockResolvedValue({ options: ORGS, unavailable: false });
    retrieveSignUpFunction.mockClear();
    mockFormValues = {};
  });

  it('sends the canonical organization NAME, not the react-select option object', async () => {
    // cloudcode's signup does `user.set('organization', String(organization))`.
    // Hand it an object and every account is stored as the literal string
    // "[object Object]" — which is exactly the empty-app-with-no-error bug the
    // picker was built to kill. Collect also renders _User.organization straight
    // into JSX, and matches records on it with an exact equalTo.
    mockFormValues = {
      email: 'someone@example.org',
      organization: { label: 'Puente', value: 'b' },
    };

    render(<Register />);
    await screen.findByTestId('picker-organization');

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(retrieveSignUpFunction).toHaveBeenCalledWith(
      expect.objectContaining({ organization: 'Puente' }),
      expect.anything(),
    );
  });
});
