import { loadOrganizationAdmin } from 'app/epics/OrganizationAdmin/loadOrganizationAdmin';
import OrganizationAdminEpic from 'app/epics/OrganizationAdmin/OrganizationAdmin';
import { AppShell } from 'app/impacto-design-system';
import {
  createOrganization,
  editOrganizationAliases,
  listOrganizationMembers,
  myOrganizationAccess,
  setOrgAdmin,
  setUserActive,
} from 'app/modules/cloud-code';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useCallback, useEffect, useState } from 'react';

/**
 * Organization administration.
 *
 * Two audiences on one surface: Puente staff administer every organization,
 * a partner's own admin administers theirs. Everyone else is redirected.
 *
 * The guard is UX, not security. Every endpoint this screen calls is gated
 * server-side on the master key, the `puente_staff` role, or that
 * organization's admin role — so a non-admin who reaches this route by typing
 * it gets a screen whose every action fails. Redirecting is a courtesy.
 *
 * `myOrganizationAccess` fails closed and never throws, because a rejected
 * promise in a route guard blanks the page.
 */
export default function OrganizationAdminPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [access, setAccess] = useState(null);
  const [data, setData] = useState(null);
  const [membersByShortCode, setMembers] = useState({});

  /**
   * Members for the organizations this viewer administers.
   *
   * Staff are NOT fanned out across every organization: with dozens of partners
   * that is dozens of round-trips on page load, and the screen's job is to let
   * someone act on one organization at a time.
   *
   * `orgAdminOf` is one organization for almost every partner admin, so these
   * run in parallel — there is no ordering between them and nothing to
   * serialise for.
   */
  const loadMembers = useCallback(async (shortCodes) => {
    const results = await Promise.all(shortCodes.map(async (shortCode) => {
      try {
        return { shortCode, members: await listOrganizationMembers({ shortCode }) };
      } catch (error) {
        // A failed read must never read as an empty team downstream.
        return { shortCode, failed: true };
      }
    }));

    const next = {};
    results.forEach(({ shortCode, members, failed }) => {
      if (failed) next.unavailable = true;
      else next[shortCode] = members;
    });
    setMembers(next);
  }, []);

  const load = useCallback(async (currentAccess) => {
    setData(await loadOrganizationAdmin({ Parse }));
    await loadMembers(currentAccess.orgAdminOf);
  }, [loadMembers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await myOrganizationAccess();
      if (cancelled) return;
      setAccess(result);
      if (!result.isStaff && result.orgAdminOf.length === 0) {
        router.replace('/quick-start');
        return;
      }
      await load(result);
    })();
    return () => { cancelled = true; };
  }, [load, router]);

  // Re-read after every write: a new alias can resolve accounts that were in
  // the unresolved queue a moment ago, and a promotion changes the member list.
  const after = async (action) => {
    await action();
    if (access) await load(access);
  };

  return (
    <AppShell breadcrumb={[t('org_admin_breadcrumb')]}>
      {access && data ? (
        <OrganizationAdminEpic
          data={data}
          membersByShortCode={membersByShortCode}
          // Staff see every organization and the cross-tenant unresolved queue;
          // a partner's admin sees only their own. The server refuses either
          // way - this decides what is worth drawing.
          access={access}
          onCreate={(params) => after(() => createOrganization(params))}
          onEditAliases={(params) => after(() => editOrganizationAliases(params))}
          onSetOrgAdmin={(params) => after(() => setOrgAdmin(params))}
          onSetUserActive={(params) => after(() => setUserActive(params))}
        />
      ) : (
        <p>{t('org_admin_loading')}</p>
      )}
    </AppShell>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
