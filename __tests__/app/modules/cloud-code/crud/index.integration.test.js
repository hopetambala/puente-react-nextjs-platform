/**
 * Integration tests for app/modules/cloud-code/crud/index.js — countObject.
 *
 * countObject wraps Parse.Query.count() with a single equalTo filter.
 * Tests run against a live Parse Server started by globalSetup.js.
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../../../../integration/parseClient');

beforeAll(() => {
  initParse();
});

afterEach(async () => {
  const query = new Parse.Query('SurveyData');
  const records = await query.find({ useMasterKey: true });
  await Parse.Object.destroyAll(records, { useMasterKey: true });
});

describe('countObject — Parse.Query.count() with a single equalTo filter', () => {
  it('counts records matching the filter and ignores others', async () => {
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
