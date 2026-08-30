import { loadOrganizationAdmin } from 'app/epics/OrganizationAdmin/loadOrganizationAdmin';
import OrganizationAdminEpic from 'app/epics/OrganizationAdmin/OrganizationAdmin';
import { AppShell } from 'app/impacto-design-system';
import {
  createOrganization,
  editOrganizationAliases,
  isStaff,
} from 'app/modules/cloud-code';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useCallback, useEffect, useState } from 'react';

/**
 * Staff-only organization administration.
 *
 * The guard here is UX, not security. Every endpoint this screen calls is gated
 * server-side on the master key or the `puente_staff` role, so a non-staff user
 * who reaches this route by typing it gets a screen whose every action fails —
 * redirecting them is a courtesy, not the boundary.
 *
 * `isStaff` fails closed and never throws (see app/modules/cloud-code/
 * organization-admin), because a rejected promise in a route guard blanks the
 * page.
 */
export default function OrganizationAdminPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setData(await loadOrganizationAdmin({ Parse }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const staff = await isStaff();
      if (cancelled) return;
      setAllowed(staff);
      if (!staff) {
        router.replace('/quick-start');
        return;
      }
      await load();
    })();
    return () => { cancelled = true; };
  }, [load, router]);

  // Re-read after a write so the registry and the unresolved queue reflect it.
  // A new alias can resolve accounts that were in the queue a moment ago.
  const onCreate = async (params) => {
    await createOrganization(params);
    await load();
  };

  const onEditAliases = async (params) => {
    await editOrganizationAliases(params);
    await load();
  };

  return (
    <AppShell breadcrumb={[t('org_admin_breadcrumb')]}>
      {allowed && data ? (
        <OrganizationAdminEpic
          data={data}
          onCreate={onCreate}
          onEditAliases={onEditAliases}
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
