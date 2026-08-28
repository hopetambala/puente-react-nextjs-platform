import { summarizeCoverage } from 'app/epics/DashboardTriage/coverage';

const NOW = new Date('2026-08-21T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 24 * 3600 * 1000);
const rec = (community, days) => ({ community, syncedAt: daysAgo(days) });

describe('summarizeCoverage', () => {
  it('counts records per community', () => {
    const { communities } = summarizeCoverage({
      records: [rec('Los Alcarrizos', 0), rec('Los Alcarrizos', 1), rec('Batey 7', 2)],
      now: NOW,
      sampleSize: 1000,
    });
    const byName = Object.fromEntries(communities.map((c) => [c.name, c]));

    expect(byName['Los Alcarrizos'].records).toBe(2);
    expect(byName['Batey 7'].records).toBe(1);
  });

  it('tracks the most recent sync per community, not the oldest', () => {
    const { communities } = summarizeCoverage({
      records: [rec('Batey 7', 30), rec('Batey 7', 3)],
      now: NOW,
      sampleSize: 1000,
    });

    expect(communities[0].daysQuiet).toBe(3);
  });

  it('sorts quietest first, because the silence is the finding', () => {
    const { communities } = summarizeCoverage({
      records: [rec('Fresh', 0), rec('Quiet', 31), rec('Middling', 8)],
      now: NOW,
      sampleSize: 1000,
    });

    expect(communities.map((c) => c.name)).toEqual(['Quiet', 'Middling', 'Fresh']);
  });

  it('skips records with no community name and reports how many', () => {
    const result = summarizeCoverage({
      records: [rec('Batey 7', 1), { community: '', syncedAt: daysAgo(1) }, { syncedAt: daysAgo(2) }],
      now: NOW,
      sampleSize: 1000,
    });

    expect(result.communities).toHaveLength(1);
    expect(result.skippedNoCommunity).toBe(2);
  });

  it('is NOT approximate when the sample did not saturate', () => {
    const result = summarizeCoverage({
      records: [rec('Batey 7', 1)],
      now: NOW,
      sampleSize: 1000,
    });

    expect(result.approximate).toBe(false);
  });

  it('IS approximate when the sample hit its cap, since more may exist', () => {
    const records = Array.from({ length: 50 }, () => rec('Batey 7', 1));
    const result = summarizeCoverage({ records, now: NOW, sampleSize: 50 });

    expect(result.approximate).toBe(true);
  });

  it('returns an empty summary for no records', () => {
    const result = summarizeCoverage({ records: [], now: NOW, sampleSize: 1000 });

    expect(result.communities).toEqual([]);
    expect(result.approximate).toBe(false);
  });
});
