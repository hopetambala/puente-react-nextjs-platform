import { buildTools } from 'server/agent/tools';

jest.mock('server/agent/parseRest', () => ({
  ALLOWED_CLASSES: ['SurveyData', 'Household', 'Vitals', 'FormResults', 'FormSpecificationsV2'],
  orgScopedQuery: jest.fn(),
}));

const { orgScopedQuery } = require('server/agent/parseRest');

describe('buildTools', () => {
  const context = { organization: 'Puente-DR', sessionToken: 'tok-1' };
  let tools;

  beforeEach(() => {
    jest.clearAllMocks();
    tools = buildTools(context);
  });

  it('exposes exactly the four read-only tools', () => {
    expect(Object.keys(tools).sort()).toEqual([
      'countRecords',
      'getDistinctValues',
      'getRecentActivity',
      'listRecords',
    ]);
  });

  describe('countRecords', () => {
    it('counts with org context and optional date range', async () => {
      orgScopedQuery.mockResolvedValue({ results: [], count: 42 });

      const result = await tools.countRecords.execute({
        className: 'SurveyData',
        createdAfter: '2026-07-01',
        filters: { communityname: 'Consuelo' },
      });

      expect(orgScopedQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'SurveyData',
          organization: 'Puente-DR',
          sessionToken: 'tok-1',
          count: true,
          limit: 0,
          where: expect.objectContaining({
            communityname: 'Consuelo',
            createdAt: expect.objectContaining({
              $gte: expect.objectContaining({ __type: 'Date' }),
            }),
          }),
        }),
      );
      expect(result).toEqual({ count: 42 });
    });

    it('drops filter fields that are not whitelisted', async () => {
      orgScopedQuery.mockResolvedValue({ results: [], count: 0 });

      await tools.countRecords.execute({
        className: 'SurveyData',
        filters: { password: 'sneaky', communityname: 'Consuelo' },
      });

      const { where } = orgScopedQuery.mock.calls[0][0];
      expect(where.password).toBeUndefined();
      expect(where.communityname).toBe('Consuelo');
    });
  });

  describe('listRecords', () => {
    it('projects only whitelisted fields and caps the limit at 50', async () => {
      orgScopedQuery.mockResolvedValue({ results: [{ objectId: 'r1', fname: 'Ana' }] });

      const result = await tools.listRecords.execute({ className: 'SurveyData', limit: 500 });

      expect(orgScopedQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          keys: expect.arrayContaining(['fname', 'communityname', 'surveyingUser', 'createdAt']),
        }),
      );
      expect(result.records).toEqual([{ objectId: 'r1', fname: 'Ana' }]);
    });

    it('floors a non-positive limit to at least 1', async () => {
      orgScopedQuery.mockResolvedValue({ results: [] });
      await tools.listRecords.execute({ className: 'SurveyData', limit: 0 });
      expect(orgScopedQuery).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
    });
  });

  describe('getDistinctValues', () => {
    it('reduces sampled records to unique values (no master-key distinct)', async () => {
      orgScopedQuery.mockResolvedValue({
        results: [
          { surveyingUser: 'ana' },
          { surveyingUser: 'ben' },
          { surveyingUser: 'ana' },
          {},
        ],
      });

      const result = await tools.getDistinctValues.execute({ field: 'surveyingUser' });

      expect(orgScopedQuery).toHaveBeenCalledWith(
        expect.objectContaining({ keys: ['surveyingUser'], limit: 1000 }),
      );
      expect(result).toEqual({ values: ['ana', 'ben'], total: 2 });
    });
  });

  describe('getRecentActivity', () => {
    it('returns recent records newest first', async () => {
      orgScopedQuery.mockResolvedValue({
        results: [{ objectId: 'r2', surveyingUser: 'ana', createdAt: '2026-07-24T10:00:00Z' }],
      });

      const result = await tools.getRecentActivity.execute({ limit: 10 });

      expect(orgScopedQuery).toHaveBeenCalledWith(
        expect.objectContaining({ order: '-createdAt', limit: 10 }),
      );
      expect(result.records).toHaveLength(1);
    });

    it('floors a non-positive limit to at least 1', async () => {
      orgScopedQuery.mockResolvedValue({ results: [] });
      await tools.getRecentActivity.execute({ limit: -5 });
      expect(orgScopedQuery).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
    });
  });
});
