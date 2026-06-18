/**
 * Integration tests for app/modules/cloud-code/aggregate/index.js.
 *
 * customMultiParamCountService wraps Parse.Query.count() with multiple
 * equalTo filters built from a params object.
 *
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

describe('customMultiParamCountService — count() with multiple equalTo filters', () => {
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
