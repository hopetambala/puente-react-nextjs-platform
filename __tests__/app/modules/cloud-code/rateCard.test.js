import '@testing-library/jest-dom';

import { getRateCard, updateRateCard } from 'app/modules/cloud-code/rate-card';

const parseWith = (impl) => ({ Cloud: { run: jest.fn(impl) } });

describe('getRateCard', () => {
  it('asks Cloud Code, not the browser SDK', async () => {
    // RateCard has no public read - a partner must not be able to read every
    // other partner's list price out of the browser - so a direct query would
    // come back empty and every price would render as unset.
    const Parse = parseWith(async () => ({ currency: 'usd', plans: { partner: 15000 } }));
    const card = await getRateCard({ Parse });
    expect(Parse.Cloud.run).toHaveBeenCalledWith('getRateCard', {});
    expect(card.plans.partner).toBe(15000);
  });

  it('returns null rather than throwing when the read fails', async () => {
    // The billing screen must be able to tell "no card configured" from "could
    // not read the card". Throwing here would blank the page.
    const Parse = parseWith(async () => { throw new Error('offline'); });
    await expect(getRateCard({ Parse })).resolves.toBeNull();
  });
});

describe('updateRateCard', () => {
  it('sends the amounts through to Cloud Code', async () => {
    const Parse = parseWith(async () => ({ updated: true }));
    await updateRateCard({ plans: { partner: 15000 } }, { Parse });
    expect(Parse.Cloud.run).toHaveBeenCalledWith('updateRateCard', { plans: { partner: 15000 } });
  });

  it('lets a write error reach the caller', async () => {
    // The opposite of the read. A failed price change MUST be visible: silently
    // swallowing it would leave the operator believing a rate was saved.
    const Parse = parseWith(async () => { throw new Error('not staff'); });
    await expect(updateRateCard({}, { Parse })).rejects.toThrow(/not staff/);
  });
});
