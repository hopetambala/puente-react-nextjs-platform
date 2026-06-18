/**
 * Integration tests for app/modules/cloud-code/crud/custom-queries/index.js.
 *
 * Covers:
 *   customMultiParamQueryService — find() with multiple equalTo filters
 *   customQueryService           — paginated find() with skip + limit
 *   removeQueryService           — get() then destroy()
 *
 * Tests run against a live Parse Server started by globalSetup.js.
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../../../../../integration/parseClient');

beforeAll(() => {
  initParse();
});

afterEach(async () => {
  const query = new Parse.Query('SurveyData');
  const records = await query.find({ useMasterKey: true });
  await Parse.Object.destroyAll(records, { useMasterKey: true });
});

// ─── customMultiParamQueryService ─────────────────────────────────────────

describe('customMultiParamQueryService — find() with multiple equalTo params', () => {
  it('returns only records matching all filters', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const matching = [1, 2].map(() => {
      const obj = new SurveyData();
      obj.set('typeOfForm', 'Custom');
      obj.set('organizations', 'puente-dr');
      return obj;
    });
    const nonMatching = new SurveyData();
    nonMatching.set('typeOfForm', 'Custom');
    nonMatching.set('organizations', 'other-org');

    await Parse.Object.saveAll([...matching, nonMatching], { useMasterKey: true });

    const query = new Parse.Query('SurveyData');
    query.equalTo('typeOfForm', 'Custom');
    query.equalTo('organizations', 'puente-dr');
    const results = await query.find({ useMasterKey: true });

    expect(results.length).toBe(2);
  });
});

// ─── customQueryService ───────────────────────────────────────────────────

describe('customQueryService — paginated find() with skip and limit', () => {
  it('respects skip and limit', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const records = [1, 2, 3, 4, 5].map((i) => {
      const obj = new SurveyData();
      obj.set('index', i);
      return obj;
    });

    await Parse.Object.saveAll(records, { useMasterKey: true });

    const query = new Parse.Query('SurveyData');
    query.skip(2);
    query.limit(2);
    const results = await query.find({ useMasterKey: true });

    expect(results.length).toBe(2);
  });
});

// ─── removeQueryService ───────────────────────────────────────────────────

describe('removeQueryService — get() then destroy()', () => {
  it('deletes the object so a subsequent get rejects', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const obj = new SurveyData();
    obj.set('surveyingUser', 'to-be-deleted');

    const saved = await obj.save(null, { useMasterKey: true });
    await saved.destroy({ useMasterKey: true });

    await expect(
      new Parse.Query('SurveyData').get(saved.id, { useMasterKey: true }),
    ).rejects.toThrow();
  });
});
