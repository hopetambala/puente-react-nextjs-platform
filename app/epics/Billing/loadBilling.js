/**
 * Data for the billing surface.
 *
 * Organizations come from Parse (public read). Invoices are a MIRROR of Stripe
 * and do not exist yet — the class lands with the Stripe service module. Until
 * then this returns `null` for invoices, which the surface renders as
 * "could not be read", NOT as "nothing outstanding".
 *
 * That distinction is deliberate and is the reason this returns null rather than
 * an empty array: on a money screen an unknown state shown as zero owed looks
 * exactly like good news.
 */
export const ORGANIZATION_FETCH_LIMIT = 500;

export async function loadBilling({ Parse, listInvoices } = {}) {
  try {
    const query = new Parse.Query('Organization');
    query.select('name', 'shortCode', 'plan', 'billingEmail', 'active');
    query.limit(ORGANIZATION_FETCH_LIMIT);
    const records = await query.find();

    const organizations = records
        .map((r) => ({
          shortCode: r.get('shortCode'),
          name: r.get('name'),
          plan: r.get('plan'),
          billingEmail: r.get('billingEmail'),
          active: r.get('active'),
        }))
        // Dormant organizations are registered so their accounts resolve; they
        // are not billing subjects and would pad this list with 21 rows.
        .filter((o) => o.active !== false)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    // No invoice reader supplied means the mirror is not wired yet. Null, never
    // [] - see the note above.
    if (!listInvoices) return { organizations, invoices: null, unavailable: false };

    // One read per organization: `listInvoices` is scoped server-side because
    // the Invoice rows carry no public read, so there is no cross-org query to
    // make. With 37 active organizations that is 37 round trips, which is why
    // a failure of ANY one of them must not silently shrink the list.
    const perOrg = await Promise.all(
      organizations.map((org) => listInvoices(org.shortCode)),
    );
    const anyFailed = perOrg.some((rows) => rows === null);

    return {
      organizations,
      invoices: anyFailed ? null : perOrg.flat(),
      unavailable: false,
    };
  } catch (error) {
    return { organizations: [], invoices: null, unavailable: true };
  }
}

export default loadBilling;
