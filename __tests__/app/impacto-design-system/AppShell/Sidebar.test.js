import '@testing-library/jest-dom';

import Sidebar from 'app/impacto-design-system/AppShell/Sidebar';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('app/modules/user', () => ({ retrieveSignOutFunction: () => Promise.resolve() }));

/** The group heading a nav item sits under, walked from the rendered DOM. */
const groupOf = (labelKey) => {
  const link = screen.getByText(labelKey).closest('a');
  const group = link.parentElement;
  return group.querySelector('div').textContent;
};

describe('Sidebar grouping', () => {
  it('puts Review under Org, not Workspace', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('nav_dashboard')).toEqual('Org');
  });

  it('leaves the other workspace items where they are', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('nav_form_manager')).toEqual('Workspace');
    expect(groupOf('nav_data')).toEqual('Workspace');
  });

  it('keeps Settings under Org', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('nav_settings')).toEqual('Org');
  });
});
