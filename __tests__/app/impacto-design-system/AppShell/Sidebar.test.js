import '@testing-library/jest-dom';

import Sidebar from 'app/impacto-design-system/AppShell/Sidebar';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('app/modules/user', () => ({ retrieveSignOutFunction: () => Promise.resolve() }));

/** The group a nav item sits under: the list's accessible name, which comes
 *  from the group title it is aria-labelledby. */
const groupOf = (labelKey) => {
  const list = screen.getByText(labelKey).closest('ul');
  return document.getElementById(list.getAttribute('aria-labelledby')).textContent;
};

describe('Sidebar grouping', () => {
  it('puts the Dashboard under Organization, not Workspace', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('breadcrumb_dashboard')).toEqual('nav_group_org');
  });

  it('leaves the other workspace items where they are', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('page_form_manager_title')).toEqual('nav_group_workspace');
    expect(groupOf('nav_data_curation')).toEqual('nav_group_workspace');
  });

  it('keeps Settings under Org', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('account_settings_title')).toEqual('nav_group_org');
  });
});

describe('Sidebar — copy', () => {
  it('leaves the brand name untranslated', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    // "Puente" is the product's name, not copy.
    expect(screen.getByText('Puente')).toBeInTheDocument();
  });

  // The live-pulse tooltip is routed through t() but cannot be asserted here:
  // no nav item sets `live`, so the branch never renders. Left covered by the
  // routing itself rather than a test that would have to fake the flag.
  it('renders no live pulse, because no nav item declares one', () => {
    const { container } = render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    expect(container.querySelector('[title]')).toBeNull();
  });
});
