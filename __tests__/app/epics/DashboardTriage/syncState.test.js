import { summarizeSyncState } from 'app/epics/DashboardTriage/syncState';

const NOW = new Date('2026-08-21T12:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600 * 1000);

describe('summarizeSyncState', () => {
  it('reports never when nothing has ever synced', () => {
    const s = summarizeSyncState({ lastSyncAt: null, recordsLast24h: 0, now: NOW });

    expect(s.status).toBe('never');
    expect(s.hoursSince).toBeNull();
  });

  it('is fresh when the last sync is under 24 hours old', () => {
    const s = summarizeSyncState({ lastSyncAt: hoursAgo(3), recordsLast24h: 47, now: NOW });

    expect(s.status).toBe('fresh');
    expect(s.hoursSince).toBe(3);
    expect(s.recordsLast24h).toBe(47);
  });

  it('is aging between 24 and 72 hours', () => {
    expect(summarizeSyncState({ lastSyncAt: hoursAgo(30), recordsLast24h: 0, now: NOW }).status)
      .toBe('aging');
  });

  it('is stale beyond 72 hours', () => {
    const s = summarizeSyncState({ lastSyncAt: hoursAgo(24 * 9), recordsLast24h: 0, now: NOW });

    expect(s.status).toBe('stale');
    expect(s.daysSince).toBe(9);
  });

  it('treats exactly 24 hours as aging, not fresh', () => {
    expect(summarizeSyncState({ lastSyncAt: hoursAgo(24), recordsLast24h: 0, now: NOW }).status)
      .toBe('aging');
  });

  it('returns a status key rather than display text, so the caller can translate', () => {
    const s = summarizeSyncState({ lastSyncAt: hoursAgo(1), recordsLast24h: 5, now: NOW });

    expect(Object.values(s)).not.toContain('Last sync');
    expect(s.status).toMatch(/^(never|fresh|aging|stale)$/);
  });

  it('reports unknown, not never, when the last-sync read did not run', () => {
    const s = summarizeSyncState({
      lastSyncAvailable: false, lastSyncAt: null, recordsLast24h: 0, now: NOW,
    });

    expect(s.status).toBe('unknown');
    expect(s.status).not.toBe('never');
  });
});
