/**
 * Integration tests for direct Parse.Query patterns used by
 * app/modules/cloud-code/crud/index.js (the client-side query helpers).
 *
 * These tests exercise the SDK query API directly against a live Parse Server
 * started by globalSetup.js — no cloud functions involved.
 *
 * Run with:
 *   yarn jest --config jest.integration.config.js __tests__/integration/crud/queries.integration.test.js
 */

const { initParse, Parse } = require('../parseClient');

beforeAll(() => {
  initParse();
});

afterEach(async () => {
  const query = new Parse.Query('SurveyData');
  const records = await query.find({ useMasterKey: true });
  await Parse.Object.destroyAll(records, { useMasterKey: true });
});

// ─── 1a — countObject pattern ─────────────────────────────────────────────

describe('countObject pattern — Parse.Query.count()', () => {
  it('counts records matching a single equalTo filter', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const aliceRecords = [1, 2, 3].map(() => {
      const obj = new SurveyData();
      obj.set('surveyingUser', 'alice');
      return obj;
    });
    const bobRecord = new SurveyData();
    bobRecord.set('surveyingUser', 'bob');

    await Parse.Object.saveAll([...aliceRecords, bobRecord], { useMasterKey: true });

    const query = new Parse.Query('SurveyData');
    query.equalTo('surveyingUser', 'alice');
    const count = await query.count({ useMasterKey: true });

    expect(count).toBe(3);
  });
});

// ─── 1b — customMultiParamQueryService pattern ────────────────────────────

describe('customMultiParamQueryService pattern — Parse.Query.find() with multiple params', () => {
  it('returns only records matching all equalTo filters', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const matchingRecords = [1, 2].map(() => {
      const obj = new SurveyData();
      obj.set('typeOfForm', 'Custom');
      obj.set('organizations', 'puente-dr');
      return obj;
    });
    const nonMatchingRecord = new SurveyData();
    nonMatchingRecord.set('typeOfForm', 'Custom');
    nonMatchingRecord.set('organizations', 'other-org');

    await Parse.Object.saveAll([...matchingRecords, nonMatchingRecord], { useMasterKey: true });

    const query = new Parse.Query('SurveyData');
    query.equalTo('typeOfForm', 'Custom');
    query.equalTo('organizations', 'puente-dr');
    const results = await query.find({ useMasterKey: true });

    expect(results.length).toBe(2);
  });
});

// ─── 1c — customQueryService pattern ─────────────────────────────────────

describe('customQueryService pattern — paginated Parse.Query.find()', () => {
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

// ─── 1d — removeQueryService pattern ─────────────────────────────────────

describe('removeQueryService pattern — Parse.Query.get() then destroy()', () => {
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

// ─── 1e — customMultiParamCountService pattern ────────────────────────────

describe('customMultiParamCountService pattern — Parse.Query.count() with multiple params', () => {
  it('counts only records matching all filters', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const customRecords = [1, 2, 3].map(() => {
      const obj = new SurveyData();
      obj.set('typeOfForm', 'Custom');
      obj.set('organizations', 'puente-dr');
      return obj;
    });
    const standardRecords = [1, 2].map(() => {
      const obj = new SurveyData();
      obj.set('typeOfForm', 'Standard');
      obj.set('organizations', 'puente-dr');
      return obj;
    });

    await Parse.Object.saveAll([...customRecords, ...standardRecords], { useMasterKey: true });

    const query = new Parse.Query('SurveyData');
    query.equalTo('typeOfForm', 'Custom');
    query.equalTo('organizations', 'puente-dr');
    const count = await query.count({ useMasterKey: true });

    expect(count).toBe(3);
  });
});
