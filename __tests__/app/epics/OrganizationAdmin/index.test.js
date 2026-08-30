import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import OrganizationAdmin from 'app/epics/OrganizationAdmin/OrganizationAdmin';
import React from 'react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const org = (shortCode, name, aliases = []) => ({
  objectId: `id-${shortCode}`, shortCode, name, aliases, active: true,
});

const baseData = {
  organizations: [org('wof', 'World Outreach Fund', ['WOF'])],
  accountsChecked: 792,
  unresolved: [],
  unavailable: false,
  truncated: false,
};

// These cover the STAFF view, which is what they were written for: staff see
// every organization and the cross-tenant unresolved queue.
const renderScreen = (data = {}, actions = {}) => render(
  <OrganizationAdmin
    access={{ isStaff: true, orgAdminOf: [] }}
    data={{ ...baseData, ...data }}
    onCreate={actions.onCreate || jest.fn()}
    onEditAliases={actions.onEditAliases || jest.fn()}
  />,
);

describe('OrganizationAdmin — the registry', () => {
  it('shows each organization with its shortCode and alias set', () => {
    renderScreen();

    expect(screen.getAllByText('World Outreach Fund').length).toBeGreaterThan(0);
    expect(screen.getByText('wof')).toBeInTheDocument();
    expect(screen.getByText('WOF')).toBeInTheDocument();
  });

  it('shows the canonical name as an implicit member of the alias set', () => {
    // "One organization, several strings" is the rule that showed a Rayjon user
    // 13% of their own data. The canonical name always resolves, so a staffer
    // must not have to guess whether they need to add it by hand.
    renderScreen();

    expect(screen.getByTestId('implicit-alias-wof')).toHaveTextContent('World Outreach Fund');
  });
});

describe('OrganizationAdmin — the unresolved queue', () => {
  it('states the denominator, never a bare count of problems', () => {
    // "3 unresolved" is unreadable without "of 792 checked" — the same shape of
    // lie as a sampled total presented as exact.
    renderScreen({
      unresolved: [{ objectId: 'u1', username: 'a@b.c', organization: 'Puente Dr', createdAt: new Date() }],
    });

    expect(screen.getByTestId('unresolved-denominator')).toHaveTextContent('792');
  });

  it('renders an unavailable read distinctly — never as all-clear', () => {
    // "we could not check" and "nothing is wrong" look identical on screen, and
    // only one of them means everything is fine.
    renderScreen({ unavailable: true, unresolved: [] });

    expect(screen.getByTestId('unresolved-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('unresolved-empty')).not.toBeInTheDocument();
  });

  it('discloses a saturated read rather than showing a partial list as whole', () => {
    renderScreen({ truncated: true, unresolved: [] });

    expect(screen.getByTestId('unresolved-truncated')).toBeInTheDocument();
  });

  it('shows the all-clear empty state only when the read actually succeeded', () => {
    renderScreen({ unavailable: false, unresolved: [] });

    expect(screen.getByTestId('unresolved-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('unresolved-unavailable')).not.toBeInTheDocument();
  });
});

describe('OrganizationAdmin — creating an organization', () => {
  it('submits the typed name, shortCode and aliases', () => {
    const onCreate = jest.fn().mockResolvedValue({});
    renderScreen({}, { onCreate });

    fireEvent.change(screen.getByTestId('create-name'), { target: { value: 'Rayjon' } });
    fireEvent.change(screen.getByTestId('create-shortcode'), { target: { value: 'rayjon' } });
    fireEvent.change(screen.getByTestId('create-aliases'), { target: { value: 'Rayjon Eye Clinic' } });
    fireEvent.click(screen.getByRole('button', { name: 'org_admin_create_submit' }));

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Rayjon', shortCode: 'rayjon', aliases: ['Rayjon Eye Clinic'], active: true,
    });
  });

  it('does not call the server when required fields are missing', () => {
    const onCreate = jest.fn();
    renderScreen({}, { onCreate });

    fireEvent.click(screen.getByRole('button', { name: 'org_admin_create_submit' }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows the server refusal verbatim, because it names the offending value', async () => {
    const onCreate = jest.fn().mockRejectedValue(
      new Error('alias "WOF" already belongs to "wof"'),
    );
    renderScreen({}, { onCreate });

    fireEvent.change(screen.getByTestId('create-name'), { target: { value: 'X' } });
    fireEvent.change(screen.getByTestId('create-shortcode'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'org_admin_create_submit' }));

    expect(await screen.findByTestId('create-error'))
      .toHaveTextContent('alias "WOF" already belongs to "wof"');
  });
});

describe('OrganizationAdmin — editing aliases', () => {
  it('sends the full replacement set, so removing a spelling is expressible', async () => {
    const onEditAliases = jest.fn().mockResolvedValue({});
    renderScreen({}, { onEditAliases });

    fireEvent.change(screen.getByTestId('aliases-wof'), { target: { value: 'WOF, W.O.F.' } });
    fireEvent.click(screen.getByRole('button', { name: 'org_admin_aliases_save' }));

    expect(onEditAliases).toHaveBeenCalledWith({
      shortCode: 'wof', aliases: ['WOF', 'W.O.F.'],
    });
  });
});

describe('OrganizationAdmin — what each viewer may see', () => {
  // Caught by visual QA, not by these tests: an org admin was rendered the WHOLE
  // registry — every partner's name, alias set and an editor for each. The
  // server refuses those edits, so it was never a security hole, but a surface
  // full of controls that fail is worse than one that omits them.
  const twoOrgs = {
    ...baseData,
    organizations: [
      org('wof', 'World Outreach Fund', ['WOF']),
      org('rayjon', 'Rayjon', ['Rayjon Eye Clinic']),
    ],
  };

  it('shows an org admin only the organizations they administer', () => {
    render(
      <OrganizationAdmin
        data={twoOrgs}
        access={{ isStaff: false, orgAdminOf: ['wof'] }}
        onCreate={jest.fn()}
        onEditAliases={jest.fn()}
      />,
    );

    expect(screen.getAllByText('World Outreach Fund').length).toBeGreaterThan(0);
    expect(screen.queryByText('Rayjon')).not.toBeInTheDocument();
  });

  it('shows staff every organization', () => {
    render(
      <OrganizationAdmin
        data={twoOrgs}
        access={{ isStaff: true, orgAdminOf: [] }}
        onCreate={jest.fn()}
        onEditAliases={jest.fn()}
      />,
    );

    expect(screen.getAllByText('World Outreach Fund').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rayjon').length).toBeGreaterThan(0);
  });

  it('hides the unresolved queue from an org admin — it is cross-tenant data', () => {
    // The queue lists accounts from every organization that failed to resolve.
    // That is Puente staff's worklist, not a partner's.
    render(
      <OrganizationAdmin
        data={twoOrgs}
        access={{ isStaff: false, orgAdminOf: ['wof'] }}
        onCreate={jest.fn()}
        onEditAliases={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('unresolved-denominator')).not.toBeInTheDocument();
  });
});
