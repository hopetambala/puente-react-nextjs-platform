/**
 * settleWithin: a promise that is guaranteed to settle. Design review C7: when
 * Parse queries can't start (no session), the dashboard and curation waited on
 * them forever, with a skeleton and no way out.
 */
const { settleWithin, LoadTimeoutError, LOAD_TIMEOUT_MS } = require('app/modules/async/settleWithin');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('settleWithin', () => {
  it('passes a value through when the promise answers in time', async () => {
    await expect(settleWithin(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it('passes a rejection through unchanged', async () => {
    const err = new Error('offline');
    await expect(settleWithin(Promise.reject(err), 1000)).rejects.toBe(err);
  });

  it('rejects with LoadTimeoutError when the promise never answers', async () => {
    const pending = settleWithin(new Promise(() => {}), 1000);
    jest.advanceTimersByTime(1000);
    await expect(pending).rejects.toBeInstanceOf(LoadTimeoutError);
  });

  it('defaults to a timeout long enough for a slow field connection', () => {
    expect(LOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(20000);
  });
});
