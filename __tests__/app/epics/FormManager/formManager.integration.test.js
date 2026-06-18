const { initParse, Parse } = require('../../../integration/parseClient');

beforeAll(() => {
  initParse();
});

// ─── retrieveCustomData behavior ──────────────────────────────────────────────
// app/modules/cloud-code/custom-data-retrieval/index.js:
//   customQueryService(0, 5000, 'FormSpecificationsV2', 'organizations', organization)
//   → Parse.Query('FormSpecificationsV2').equalTo('organizations', org).find()

describe('retrieveCustomData — query FormSpecificationsV2 by organizations', () => {
  afterEach(async () => {
    const query = new Parse.Query('FormSpecificationsV2');
    const records = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(records, { useMasterKey: true });
  });

  it('returns only forms matching the given organization', async () => {
    const FormSpec = Parse.Object.extend('FormSpecificationsV2');

    const formA = new FormSpec();
    formA.set('name', 'Form A');
    formA.set('organizations', ['puente-dr']);

    const formB = new FormSpec();
    formB.set('name', 'Form B');
    formB.set('organizations', ['puente-dr']);

    const formC = new FormSpec();
    formC.set('name', 'Form C');
    formC.set('organizations', ['other-org']);

    await Parse.Object.saveAll([formA, formB, formC], { useMasterKey: true });

    const query = new Parse.Query('FormSpecificationsV2');
    query.equalTo('organizations', 'puente-dr');
    const results = await query.find({ useMasterKey: true });

    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.get('organizations')).toContain('puente-dr'));
  });

  it('returns an empty array when no forms exist for that organization', async () => {
    const query = new Parse.Query('FormSpecificationsV2');
    query.equalTo('organizations', 'nonexistent-org');
    const results = await query.find({ useMasterKey: true });

    expect(results).toHaveLength(0);
  });
});

// ─── Soft-delete behavior ─────────────────────────────────────────────────────
// app/epics/FormManager/Table/index.js handleRemove:
//   updateObject({ parseClass: 'FormSpecificationsV2', parseClassID, localObject: { active: 'false' } })
// The record is NOT destroyed — active is set to the string 'false'.
// The FormManager component filters it out in JS: record.active !== 'false'

describe('soft-delete — updateObject sets active:"false" without destroying the record', () => {
  afterEach(async () => {
    const query = new Parse.Query('FormSpecificationsV2');
    const records = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(records, { useMasterKey: true });
  });

  it('sets active to "false" and the record still exists in Parse', async () => {
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'My Form', organizations: ['puente-dr'] },
      },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'updateObject',
      {
        parseClass: 'FormSpecificationsV2',
        parseClassID: objectId,
        localObject: { active: 'false' },
      },
      { useMasterKey: true },
    );

    const record = await new Parse.Query('FormSpecificationsV2').get(objectId, {
      useMasterKey: true,
    });

    expect(record.get('active')).toBe('false');
  });

  it('does not create a duplicate record when soft-deleting', async () => {
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Solo Form', organizations: ['puente-dr'] },
      },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'updateObject',
      {
        parseClass: 'FormSpecificationsV2',
        parseClassID: objectId,
        localObject: { active: 'false' },
      },
      { useMasterKey: true },
    );

    const count = await new Parse.Query('FormSpecificationsV2').count({
      useMasterKey: true,
    });
    expect(count).toBe(1);
  });
});

// ─── RecordsTable pagination ──────────────────────────────────────────────────
// app/epics/FormManager/RecordsTable/index.js fetchRecords:
//   new Parse.Query('SurveyData')
//   query.equalTo('formSpecification', form.objectId)
//   query.limit(PAGE_SIZE)   // PAGE_SIZE = 20
//   query.skip(page * PAGE_SIZE)
//   Promise.all([query.find(), query.count()])

describe('RecordsTable — SurveyData filtered by formSpecification with limit/skip/count', () => {
  const FORM_ID = 'test-form-pagination-001';

  afterEach(async () => {
    const query = new Parse.Query('SurveyData');
    const records = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(records, { useMasterKey: true });
  });

  beforeEach(async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const records = Array.from({ length: 25 }, () => {
      const obj = new SurveyData();
      obj.set('formSpecification', FORM_ID);
      return obj;
    });
    await Parse.Object.saveAll(records, { useMasterKey: true });
  });

  it('find with limit(20) and skip(0) returns the first 20 records', async () => {
    const query = new Parse.Query('SurveyData');
    query.equalTo('formSpecification', FORM_ID);
    query.limit(20);
    query.skip(0);
    const results = await query.find({ useMasterKey: true });

    expect(results).toHaveLength(20);
  });

  it('count returns the total number of matching records', async () => {
    const query = new Parse.Query('SurveyData');
    query.equalTo('formSpecification', FORM_ID);
    const count = await query.count({ useMasterKey: true });

    expect(count).toBe(25);
  });

  it('find with skip(20) and limit(20) returns the remaining 5 records', async () => {
    const query = new Parse.Query('SurveyData');
    query.equalTo('formSpecification', FORM_ID);
    query.limit(20);
    query.skip(20);
    const results = await query.find({ useMasterKey: true });

    expect(results).toHaveLength(5);
  });

  it('returns no records for a formSpecification that has no data', async () => {
    const query = new Parse.Query('SurveyData');
    query.equalTo('formSpecification', 'nonexistent-form-id');
    const results = await query.find({ useMasterKey: true });

    expect(results).toHaveLength(0);
  });
});

// ─── retrievePuenteFormModifications behavior ─────────────────────────────────
// app/modules/cloud-code/custom-data-retrieval/index.js:
//   customQueryService(0, 5000, 'PuenteFormModifications', 'organizations', organization)
//   → Parse.Query('PuenteFormModifications').equalTo('organizations', org).find()

describe('retrievePuenteFormModifications — query PuenteFormModifications by organizations', () => {
  afterEach(async () => {
    const query = new Parse.Query('PuenteFormModifications');
    const records = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(records, { useMasterKey: true });
  });

  it('returns only modifications matching the given organization', async () => {
    const PFM = Parse.Object.extend('PuenteFormModifications');

    const modA = new PFM();
    modA.set('name', 'Mod A');
    modA.set('organizations', ['puente-dr']);

    const modB = new PFM();
    modB.set('name', 'Mod B');
    modB.set('organizations', ['puente-dr']);

    const modC = new PFM();
    modC.set('name', 'Mod C');
    modC.set('organizations', ['other-org']);

    await Parse.Object.saveAll([modA, modB, modC], { useMasterKey: true });

    const query = new Parse.Query('PuenteFormModifications');
    query.equalTo('organizations', 'puente-dr');
    const results = await query.find({ useMasterKey: true });

    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.get('organizations')).toContain('puente-dr'));
  });
});
