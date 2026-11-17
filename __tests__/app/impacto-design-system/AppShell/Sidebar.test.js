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

    expect(groupOf('nav_dashboard')).toEqual('nav_group_org');
  });

  it('leaves the other workspace items where they are', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('nav_form_manager')).toEqual('nav_group_workspace');
    expect(groupOf('nav_data')).toEqual('nav_group_workspace');
  });

  it('keeps Settings under Org', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);

    expect(groupOf('nav_settings')).toEqual('nav_group_org');
  });
});

describe('Sidebar — copy', () => {
  // The group headings used to be the raw strings 'Workspace' and 'Org', so
  // Spanish and Creole readers saw English. They are catalog keys now.
  it('routes the group headings through t()', () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    expect(screen.getByText('nav_group_workspace')).toBeInTheDocument();
    expect(screen.getByText('nav_group_org')).toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Org')).not.toBeInTheDocument();
  });

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
