import { checkRateLimit, resetRateLimits, trackedUsers } from 'server/agent/rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());

  it('allows the first request', () => {
    expect(checkRateLimit('u1', 0)).toBe(true);
  });

  it('allows up to 20 requests within a minute', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(checkRateLimit('u1', i * 1000)).toBe(true);
    }
  });

  it('blocks the 21st request within the same minute', () => {
    for (let i = 0; i < 20; i += 1) checkRateLimit('u1', i * 1000);
    expect(checkRateLimit('u1', 20000)).toBe(false);
  });

  it('allows again after the window has passed', () => {
    for (let i = 0; i < 20; i += 1) checkRateLimit('u1', i * 1000);
    expect(checkRateLimit('u1', 61001)).toBe(true);
  });

  it('tracks users independently', () => {
    for (let i = 0; i < 20; i += 1) checkRateLimit('u1', i * 1000);
    expect(checkRateLimit('u2', 20000)).toBe(true);
  });

  it('evicts users whose window has fully expired so memory stays bounded', () => {
    checkRateLimit('old', 0);
    checkRateLimit('recent', 60000);
    // A later call sweeps fully-expired users; 'old' (only ts at 0) is gone.
    checkRateLimit('recent', 61001);
    expect(trackedUsers()).toBe(1);
  });
});
