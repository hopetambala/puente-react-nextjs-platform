/**
 * A promise that is guaranteed to settle.
 *
 * Design review C7: when Parse queries can't start (a stored user with no
 * Parse session), the dashboard and curation waited on them forever, showing a
 * skeleton with no error and no way out. Wrap a load in this and treat
 * LoadTimeoutError like any other failure: say so, offer Retry.
 */
export class LoadTimeoutError extends Error {
  constructor(ms) {
    super(`No answer within ${ms}ms`);
    this.name = 'LoadTimeoutError';
  }
}

// Long enough for a slow field connection (Slow 3G answers in seconds, not
// tens of seconds), short enough that nobody waits on a load that will never
// come.
export const LOAD_TIMEOUT_MS = 25000;

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} [ms]
 * @returns {Promise<T>}
 */
export function settleWithin(promise, ms = LOAD_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new LoadTimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
