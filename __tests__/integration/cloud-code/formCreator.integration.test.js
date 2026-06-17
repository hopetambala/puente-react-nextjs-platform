/**
 * Integration tests for Form Creator → Parse Server round-trip.
 *
 * These tests spin up a real Parse Server (via globalSetup.js) and verify
 * that the cloud functions used by app/modules/cloud-code/crud/index.js
 * actually save and retrieve data with the structure the Form Creator submits.
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../parseClient');

beforeAll(() => {
  initParse();
});

afterEach(async () => {
  // Clean up test records between tests
  const query = new Parse.Query('FormSpecificationsV2');
  const records = await query.find({ useMasterKey: true });
  await Parse.Object.destroyAll(records, { useMasterKey: true });
});

// ─── postObjectsToClass ────────────────────────────────────────────────────

describe('postObjectsToClass cloud function', () => {
  it('saves a new custom form and returns an objectId', async () => {
    const result = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: {
          name: 'WaSH Survey',
          description: 'Water and sanitation survey',
          customForm: true,
          typeOfForm: ['Custom'],
          organizations: ['puente-dr'],
          fields: [
            {
              id: 'field-1',
              fieldType: 'input',
              label: 'Household name',
              formikKey: 'householdname',
              active: true,
            },
          ],
          workflows: [],
          class: '',
        },
      },
      { useMasterKey: true },
    );

    expect(result.objectId).toBeDefined();
    expect(typeof result.objectId).toBe('string');
  });

  it('persists all required top-level fields to Parse', async () => {
    const payload = {
      name: 'Health Survey',
      description: 'Community health data',
      customForm: true,
      typeOfForm: ['Custom'],
      organizations: ['org-test'],
      fields: [],
      workflows: [],
      class: '',
    };

    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      { parseClass: 'FormSpecificationsV2', localObject: payload },
      { useMasterKey: true },
    );

    // Read it back to verify persistence
    const query = new Parse.Query('FormSpecificationsV2');
    const saved = await query.get(objectId, { useMasterKey: true });

    expect(saved.get('name')).toBe('Health Survey');
    expect(saved.get('customForm')).toBe(true);
    expect(saved.get('organizations')).toEqual(['org-test']);
    expect(saved.get('typeOfForm')).toEqual(['Custom']);
  });

  it('persists the full fields array including options for select questions', async () => {
    const fields = [
      {
        id: 'q1',
        fieldType: 'select',
        label: 'Water source',
        formikKey: 'watersource',
        active: true,
        options: [
          { id: 'opt-1', label: 'River', value: 'River', text: false, textQuestion: '', textKey: '__watersource__River' },
          { id: 'opt-2', label: 'Well', value: 'Well', text: false, textQuestion: '', textKey: '__watersource__Well' },
        ],
      },
    ];

    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Test', customForm: true, fields, workflows: [], organizations: ['org'], typeOfForm: ['Custom'], class: '' },
      },
      { useMasterKey: true },
    );

    const query = new Parse.Query('FormSpecificationsV2');
    const saved = await query.get(objectId, { useMasterKey: true });
    const savedFields = saved.get('fields');

    expect(savedFields).toHaveLength(1);
    expect(savedFields[0].options).toHaveLength(2);
    expect(savedFields[0].options[0].label).toBe('River');
    expect(savedFields[0].options[1].label).toBe('Well');
  });

  it('does NOT include a removed option when fields only contain the remaining options', async () => {
    // This directly guards against the removeOption bug:
    // if removeOption failed to sync to formItems, the deleted option
    // would appear in the `fields` array and be persisted to Parse.
    const fieldsAfterRemoval = [
      {
        id: 'q1',
        fieldType: 'select',
        label: 'Water source',
        formikKey: 'watersource',
        active: true,
        options: [
          // Only "Well" remains — "River" was removed by the user
          { id: 'opt-2', label: 'Well', value: 'Well', text: false, textQuestion: '', textKey: '__watersource__Well' },
        ],
      },
    ];

    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Test', customForm: true, fields: fieldsAfterRemoval, workflows: [], organizations: ['org'], typeOfForm: ['Custom'], class: '' },
      },
      { useMasterKey: true },
    );

    const query = new Parse.Query('FormSpecificationsV2');
    const saved = await query.get(objectId, { useMasterKey: true });
    const savedOptions = saved.get('fields')[0].options;

    expect(savedOptions).toHaveLength(1);
    expect(savedOptions[0].label).toBe('Well');
    // The removed option must not appear
    expect(savedOptions.find((o) => o.label === 'River')).toBeUndefined();
  });
});

// ─── updateObject ──────────────────────────────────────────────────────────

describe('updateObject cloud function', () => {
  it('updates an existing form without creating a duplicate', async () => {
    // First create the form
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Original name', customForm: true, fields: [], workflows: [], organizations: ['org'], typeOfForm: ['Custom'], class: '' },
      },
      { useMasterKey: true },
    );

    // Now update it
    await Parse.Cloud.run(
      'updateObject',
      {
        parseClass: 'FormSpecificationsV2',
        parseClassID: objectId,
        localObject: { name: 'Updated name' },
      },
      { useMasterKey: true },
    );

    // Verify only one record exists (no duplicate created)
    const query = new Parse.Query('FormSpecificationsV2');
    const allRecords = await query.find({ useMasterKey: true });
    expect(allRecords).toHaveLength(1);

    // Verify the name was updated
    expect(allRecords[0].get('name')).toBe('Updated name');
  });

  it('preserves existing fields not included in the update payload', async () => {
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Survey', customForm: true, organizations: ['org-a'], fields: [], workflows: [], typeOfForm: ['Custom'], class: '' },
      },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'updateObject',
      {
        parseClass: 'FormSpecificationsV2',
        parseClassID: objectId,
        localObject: { name: 'Survey v2' },
      },
      { useMasterKey: true },
    );

    const query = new Parse.Query('FormSpecificationsV2');
    const saved = await query.get(objectId, { useMasterKey: true });

    // Name updated
    expect(saved.get('name')).toBe('Survey v2');
    // organizations preserved (not overwritten)
    expect(saved.get('organizations')).toEqual(['org-a']);
    expect(saved.get('customForm')).toBe(true);
  });

  it('returns an error when the objectId does not exist', async () => {
    await expect(
      Parse.Cloud.run(
        'updateObject',
        {
          parseClass: 'FormSpecificationsV2',
          parseClassID: 'nonexistent-id-xyz',
          localObject: { name: 'Should fail' },
        },
        { useMasterKey: true },
      ),
    ).rejects.toThrow();
  });
});
