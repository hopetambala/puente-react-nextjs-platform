import Billing from 'app/epics/Billing/Billing';
import { loadBilling } from 'app/epics/Billing/loadBilling';
import { AppShell } from 'app/impacto-design-system';
import { myOrganizationAccess } from 'app/modules/cloud-code';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

/**
 * Billing — Puente staff only.
 *
 * Phase 2 of the billing scope ships staff-only by design. The partner-facing
 * half (an organization seeing its own invoices) waits for the ACL work,
 * because before that a client-side role check would let one partner read
 * another's invoices. That is sequencing, not a scope cut.
 *
 * This guard is UX. `myOrganizationAccess` fails closed and never throws — a
 * rejected promise in a route guard blanks the page.
 */
export default function BillingPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [isStaff, setIsStaff] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function check() {
      const access = await myOrganizationAccess().catch(() => null);
      if (ignore) return;
      const staff = Boolean(access && access.isStaff);
      setIsStaff(staff);
      if (!staff) router.push('/');
      else setData(await loadBilling({ Parse }));
    }
    check();
    return () => { ignore = true; };
  }, [router]);

  if (!isStaff) return null;

  return (
    <AppShell title={t('billing_title')}>
      {data && (
        <Billing organizations={data.organizations} invoices={data.invoices} />
      )}
    </AppShell>
  );
}

export async function getStaticProps({ locale }) {
  return { props: { ...await serverSideTranslations(locale, ['common']) } };
}
