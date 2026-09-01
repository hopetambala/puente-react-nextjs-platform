import { Parse as defaultParse } from 'parse';

/**
 * Wrappers for the rate card Cloud functions.
 *
 * Both go through Cloud Code rather than the browser SDK because the `RateCard`
 * row has no public read — a partner must not be able to read every other
 * partner's list price out of the browser. A direct query would come back empty
 * and every price would silently render as unset.
 */

/**
 * The current rate card, or `null` if it could not be read.
 *
 * Null rather than a throw, because the billing screen has to distinguish "no
 * card configured yet" (a real, expected state that shows defaults) from "we
 * could not read the card" — and a rejected promise would blank the page.
 */
export async function getRateCard({ Parse = defaultParse } = {}) {
  try {
    return await Parse.Cloud.run('getRateCard', {});
  } catch (error) {
    return null;
  }
}

/**
 * Writes the rate card. Staff only, enforced server-side.
 *
 * Deliberately does NOT swallow errors, unlike the read above. A failed price
 * change must be visible: silently absorbing it would leave an operator
 * believing a rate was saved, and the next invoice would quietly use the old
 * number.
 */
export async function updateRateCard(card, { Parse = defaultParse } = {}) {
  return Parse.Cloud.run('updateRateCard', card);
}

export default { getRateCard, updateRateCard };

/**
 * Invoices for one organization, from the Parse mirror of Stripe.
 *
 * Null on failure, never `[]`. "We could not read what is outstanding" and
 * "nothing is outstanding" must never be the same value on a money screen -
 * an unreadable state rendered as zero owed looks exactly like good news.
 */
export async function listInvoices(shortCode, { Parse = defaultParse } = {}) {
  try {
    return await Parse.Cloud.run('listInvoices', { shortCode });
  } catch (error) {
    return null;
  }
}

/**
 * Sets an organization's plan and billing contact. Staff only, enforced
 * server-side.
 *
 * Errors propagate: an unsaved billing address means the next invoice goes to
 * the old one, or nowhere at all, and the operator has to see that.
 */
export async function setOrganizationBilling(next, { Parse = defaultParse } = {}) {
  return Parse.Cloud.run('setOrganizationBilling', next);
}
