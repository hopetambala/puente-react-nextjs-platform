import '@testing-library/jest-dom';

import Sidebar from 'app/impacto-design-system/AppShell/Sidebar';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('app/modules/user', () => ({ retrieveSignOutFunction: () => Promise.resolve() }));
jest.mock('app/modules/cloud-code', () => ({ myOrganizationAccess: jest.fn() }));

const { myOrganizationAccess } = require('app/modules/cloud-code');
const { resetOrganizationAccessCache } = require('app/impacto-design-system/AppShell/Sidebar');

beforeEach(() => {
  resetOrganizationAccessCache();
  myOrganizationAccess.mockClear();
  myOrganizationAccess.mockResolvedValue({ isStaff: false, orgAdminOf: [] });
});

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

// Org admins and Puente staff could only reach /organization-admin by typing
// the URL. It gets a nav item, shown only to the people the page lets in.
// (Showing it is a courtesy: the page and every endpoint it calls check
// access themselves.)
describe('Sidebar — Organizations item', () => {
  it('is hidden from someone who administers nothing', async () => {
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    await waitFor(() => expect(myOrganizationAccess).toHaveBeenCalled());
    expect(screen.queryByText('org_admin_breadcrumb')).not.toBeInTheDocument();
  });

  it('is shown to Puente staff, under Org, linking to /organization-admin', async () => {
    myOrganizationAccess.mockResolvedValue({ isStaff: true, orgAdminOf: [] });
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    const link = (await screen.findByText('org_admin_breadcrumb')).closest('a');
    expect(link).toHaveAttribute('href', '/organization-admin');
    expect(groupOf('org_admin_breadcrumb')).toEqual('nav_group_org');
  });

  it("is shown to an organization's own admin", async () => {
    myOrganizationAccess.mockResolvedValue({ isStaff: false, orgAdminOf: ['PUENTE'] });
    render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    expect(await screen.findByText('org_admin_breadcrumb')).toBeInTheDocument();
  });

  it('asks the server once, not on every page', async () => {
    myOrganizationAccess.mockResolvedValue({ isStaff: true, orgAdminOf: [] });
    const { unmount } = render(<Sidebar activeRoute="dashboard" orgName="testORG" />);
    await screen.findByText('org_admin_breadcrumb');
    unmount();
    render(<Sidebar activeRoute="forms" orgName="testORG" />);
    await screen.findByText('org_admin_breadcrumb');
    expect(myOrganizationAccess).toHaveBeenCalledTimes(1);
  });
});
