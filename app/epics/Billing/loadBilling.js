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

export async function loadBilling({ Parse } = {}) {
  try {
    const query = new Parse.Query('Organization');
    query.select('name', 'shortCode', 'plan', 'active');
    query.limit(ORGANIZATION_FETCH_LIMIT);
    const records = await query.find();

    return {
      organizations: records
        .map((r) => ({
          shortCode: r.get('shortCode'),
          name: r.get('name'),
          plan: r.get('plan'),
          active: r.get('active'),
        }))
        // Dormant organizations are registered so their accounts resolve; they
        // are not billing subjects and would pad this list with 21 rows.
        .filter((o) => o.active !== false)
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      // Not [] — see the note above.
      invoices: null,
      unavailable: false,
    };
  } catch (error) {
    return { organizations: [], invoices: null, unavailable: true };
  }
}

export default loadBilling;
