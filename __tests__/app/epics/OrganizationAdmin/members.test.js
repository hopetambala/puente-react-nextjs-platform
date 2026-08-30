import '@testing-library/jest-dom';

import MembersPanel from 'app/epics/OrganizationAdmin/MembersPanel';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const member = (over = {}) => ({
  objectId: 'u1',
  username: '8095551234',
  firstname: 'Ada',
  lastname: 'Lovelace',
  role: 'contributor',
  adminVerified: false,
  deactivated: false,
  isOrgAdmin: false,
  ...over,
});

const renderPanel = (props = {}) => render(
  <MembersPanel
    shortCode="wof"
    members={props.members || [member()]}
    unavailable={props.unavailable || false}
    onSetOrgAdmin={props.onSetOrgAdmin || jest.fn()}
    onSetUserActive={props.onSetUserActive || jest.fn()}
  />,
);

describe('MembersPanel', () => {
  it('shows who each member is', () => {
    renderPanel();

    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText('8095551234')).toBeInTheDocument();
  });

  it('marks an org admin distinctly, in words not colour alone', () => {
    // A colour-only badge is invisible to a colourblind reviewer deciding who
    // can administer their organization.
    renderPanel({ members: [member({ isOrgAdmin: true })] });

    expect(screen.getByTestId('member-admin-u1')).toHaveTextContent('org_admin_member_is_admin');
  });

  it('marks a deactivated member, so the list is not misread as everyone active', () => {
    renderPanel({ members: [member({ deactivated: true })] });

    expect(screen.getByTestId('member-deactivated-u1')).toBeInTheDocument();
  });

  it('promotes a member', () => {
    const onSetOrgAdmin = jest.fn().mockResolvedValue({});
    renderPanel({ onSetOrgAdmin });

    fireEvent.click(screen.getByRole('button', { name: 'org_admin_member_promote' }));

    expect(onSetOrgAdmin).toHaveBeenCalledWith({ userId: 'u1', isAdmin: true });
  });

  it('demotes an existing admin', () => {
    const onSetOrgAdmin = jest.fn().mockResolvedValue({});
    renderPanel({ members: [member({ isOrgAdmin: true })], onSetOrgAdmin });

    fireEvent.click(screen.getByRole('button', { name: 'org_admin_member_demote' }));

    expect(onSetOrgAdmin).toHaveBeenCalledWith({ userId: 'u1', isAdmin: false });
  });

  it('deactivates a member', () => {
    const onSetUserActive = jest.fn().mockResolvedValue({});
    renderPanel({ onSetUserActive });

    fireEvent.click(screen.getByRole('button', { name: 'org_admin_member_deactivate' }));

    expect(onSetUserActive).toHaveBeenCalledWith({ userId: 'u1', active: false });
  });

  it('reactivates a deactivated member', () => {
    const onSetUserActive = jest.fn().mockResolvedValue({});
    renderPanel({ members: [member({ deactivated: true })], onSetUserActive });

    fireEvent.click(screen.getByRole('button', { name: 'org_admin_member_reactivate' }));

    expect(onSetUserActive).toHaveBeenCalledWith({ userId: 'u1', active: true });
  });

  it('shows a server refusal verbatim, because it says what to do next', async () => {
    // "Cannot demote the last admin. Appoint another admin first" is the only
    // actionable part; a generic failure would hide it.
    const onSetOrgAdmin = jest.fn().mockRejectedValue(
      new Error('Cannot demote the last admin of an organization.'),
    );
    renderPanel({ members: [member({ isOrgAdmin: true })], onSetOrgAdmin });

    fireEvent.click(screen.getByRole('button', { name: 'org_admin_member_demote' }));

    expect(await screen.findByTestId('member-error-u1'))
      .toHaveTextContent('Cannot demote the last admin');
  });

  it('renders an unavailable read distinctly, never as an empty team', () => {
    // "We could not read the members" and "this organization has none" look
    // identical otherwise, and only one of them is fine.
    renderPanel({ members: [], unavailable: true });

    expect(screen.getByTestId('members-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('members-empty')).not.toBeInTheDocument();
  });

  it('shows the empty state only when the read actually succeeded', () => {
    renderPanel({ members: [], unavailable: false });

    expect(screen.getByTestId('members-empty')).toBeInTheDocument();
  });
});
