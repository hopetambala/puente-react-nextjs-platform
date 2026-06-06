import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

jest.mock('next/router', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }));
jest.mock('app/store', () => ({
  useGlobalState: () => ({ contextManagment: { addPropToStore: jest.fn(), store: {} } }),
}));
jest.mock('app/modules/user', () => ({
  parseUserValue: jest.fn(() => ({ organization: 'static-org' })),
}));
jest.mock('app/modules/user/useCurrentUser', () => ({
  __esModule: true,
  default: jest.fn(() => ({ organization: 'hook-org' })),
}));
jest.mock('app/epics/FormCreator', () => jest.fn(() => <div data-testid="form-creator-epic" />));
jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children }) => <div>{children}</div>,
}));
jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn(() => Promise.resolve({})),
}));

const FormCreatorPage = require('pages/forms/form-creator/index').default;

describe('Reactive user', () => {
  it('passes the user from useCurrentUser to the FormCreator epic', () => {
    render(<FormCreatorPage />);
    const FormCreator = require('app/epics/FormCreator');
    expect(FormCreator).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ organization: 'hook-org' }) }),
      expect.anything(),
    );
  });
});
