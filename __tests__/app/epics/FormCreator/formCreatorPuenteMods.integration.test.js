/**
 * Integration tests for Form Creator → Parse Server round-trip using the
 * PuenteFormModifications class.
 *
 * app/epics/FormCreator/index.js submitCustomForm can target either
 * FormSpecificationsV2 (custom forms) or PuenteFormModifications (puente
 * base-form edits). This file covers the PuenteFormModifications path.
 *
 * FormSpecificationsV2 coverage lives in formCreator.integration.test.js.
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../../../integration/parseClient');

beforeAll(() => {
  initParse();
});

afterEach(async () => {
  const query = new Parse.Query('PuenteFormModifications');
  const records = await query.find({ useMasterKey: true });
  await Parse.Object.destroyAll(records, { useMasterKey: true });
});

// ─── postObjectsToClass — PuenteFormModifications ─────────────────────────────

describe('postObjectsToClass cloud function — PuenteFormModifications', () => {
  it('saves a new puente form modification and returns an objectId', async () => {
    const result = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'PuenteFormModifications',
        localObject: {
          name: 'Puente Survey Mod',
          organizations: ['puente-dr'],
          fields: [],
          customForm: true,
          typeOfForm: ['Custom'],
          workflows: [],
          class: 'PuenteFormModifications',
        },
      },
      { useMasterKey: true },
    );

    expect(result.objectId).toBeDefined();
    expect(typeof result.objectId).toBe('string');
  });

  it('persists all top-level fields to Parse', async () => {
    const payload = {
      name: 'Health Mod',
      organizations: ['org-test'],
      fields: [],
      customForm: true,
      typeOfForm: ['Custom'],
      workflows: [],
      class: 'PuenteFormModifications',
    };

    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      { parseClass: 'PuenteFormModifications', localObject: payload },
      { useMasterKey: true },
    );

    const saved = await new Parse.Query('PuenteFormModifications').get(objectId, {
      useMasterKey: true,
    });

    expect(saved.get('name')).toBe('Health Mod');
    expect(saved.get('organizations')).toEqual(['org-test']);
    expect(saved.get('customForm')).toBe(true);
    expect(saved.get('class')).toBe('PuenteFormModifications');
  });

  it('persists the fields array including options for select questions', async () => {
    const fields = [
      {
        id: 'q1',
        fieldType: 'select',
        label: 'Water source',
        formikKey: 'watersource',
        active: true,
        options: [
          { id: 'opt-1', label: 'River', value: 'River' },
          { id: 'opt-2', label: 'Well', value: 'Well' },
        ],
      },
    ];

    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'PuenteFormModifications',
        localObject: {
          name: 'Test',
          customForm: true,
          fields,
          workflows: [],
          organizations: ['org'],
          typeOfForm: ['Custom'],
          class: 'PuenteFormModifications',
        },
      },
      { useMasterKey: true },
    );

    const saved = await new Parse.Query('PuenteFormModifications').get(objectId, {
      useMasterKey: true,
    });
    const savedFields = saved.get('fields');

    expect(savedFields).toHaveLength(1);
    expect(savedFields[0].options).toHaveLength(2);
    expect(savedFields[0].options[0].label).toBe('River');
    expect(savedFields[0].options[1].label).toBe('Well');
  });
});

// ─── updateObject — PuenteFormModifications ───────────────────────────────────

describe('updateObject cloud function — PuenteFormModifications', () => {
  it('updates an existing modification without creating a duplicate', async () => {
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'PuenteFormModifications',
        localObject: {
          name: 'Original Mod',
          organizations: ['org'],
          fields: [],
          customForm: true,
          typeOfForm: ['Custom'],
          workflows: [],
          class: 'PuenteFormModifications',
        },
      },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'updateObject',
      {
        parseClass: 'PuenteFormModifications',
        parseClassID: objectId,
        localObject: { name: 'Updated Mod' },
      },
      { useMasterKey: true },
    );

    const all = await new Parse.Query('PuenteFormModifications').find({
      useMasterKey: true,
    });
    expect(all).toHaveLength(1);
    expect(all[0].get('name')).toBe('Updated Mod');
  });

  it('preserves fields not included in the update payload', async () => {
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'PuenteFormModifications',
        localObject: {
          name: 'Orig',
          organizations: ['org-a'],
          fields: [],
          customForm: true,
          typeOfForm: ['Custom'],
          workflows: [],
          class: 'PuenteFormModifications',
        },
      },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'updateObject',
      {
        parseClass: 'PuenteFormModifications',
        parseClassID: objectId,
        localObject: { name: 'Mod v2' },
      },
      { useMasterKey: true },
    );

    const saved = await new Parse.Query('PuenteFormModifications').get(objectId, {
      useMasterKey: true,
    });

    expect(saved.get('name')).toBe('Mod v2');
    expect(saved.get('organizations')).toEqual(['org-a']);
    expect(saved.get('customForm')).toBe(true);
  });

  it('rejects when the objectId does not exist', async () => {
    await expect(
      Parse.Cloud.run(
        'updateObject',
        {
          parseClass: 'PuenteFormModifications',
          parseClassID: 'nonexistent-id-xyz',
          localObject: { name: 'Should fail' },
        },
        { useMasterKey: true },
      ),
    ).rejects.toThrow();
  });
});
