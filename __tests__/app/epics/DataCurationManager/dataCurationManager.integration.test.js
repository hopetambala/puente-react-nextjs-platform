/**
 * Integration tests for DataCurationManager → Parse Server round-trip.
 *
 * Covers the unique Parse patterns used by DataCurationManager and its
 * sub-components that aren't exercised by any other integration test suite:
 *
 *   - select() for field projection (filter-options sampling)
 *   - equalTo('objectId', id) form-definition lookup
 *   - notEqualTo('active', 'false') active-form filter (SourceSelector)
 *   - greaterThanOrEqualTo / lessThanOrEqualTo date-range filters
 *   - record.set(field, value).save() bulk rename (CommunityAudit)
 *   - multi-filter paginated fetch (surveyingOrganization + optional filters)
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../../../integration/parseClient');

const ORG = 'puente-dr';
const OTHER_ORG = 'other-org';

beforeAll(() => {
  initParse();
});

// Shared cleanup helpers
async function destroyAll(parseClass) {
  const q = new Parse.Query(parseClass);
  const records = await q.find({ useMasterKey: true });
  if (records.length) await Parse.Object.destroyAll(records, { useMasterKey: true });
}

// ─── Filter-options sampling ──────────────────────────────────────────────────
// DataCurationManager/index.js — derives surveyor + community dropdowns by
// sampling up to 1000 rows with select() (Parse.distinct() needs Master Key,
// unavailable to the browser SDK, so the app samples and deduplicates in JS).
//
//   q.equalTo('surveyingOrganization', org)
//   q.select('surveyingUser', 'communityname')
//   q.limit(1000)
//   q.find()

describe('filter-options sampling — select() with equalTo on surveyingOrganization', () => {
  afterEach(() => destroyAll('SurveyData'));

  it('returns only records from the given org', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const inOrg = ['alice', 'bob'].map((user) => {
      const obj = new SurveyData();
      obj.set('surveyingOrganization', ORG);
      obj.set('surveyingUser', user);
      obj.set('communityname', 'Villa A');
      return obj;
    });

    const outOrg = new SurveyData();
    outOrg.set('surveyingOrganization', OTHER_ORG);
    outOrg.set('surveyingUser', 'carol');

    await Parse.Object.saveAll([...inOrg, outOrg], { useMasterKey: true });

    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.select('surveyingUser', 'communityname');
    q.limit(1000);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(2);
    results.forEach((r) => {
      expect(r.get('surveyingUser')).toBeTruthy();
      expect(r.get('communityname')).toBeTruthy();
    });
  });

  it('projected records expose surveyingUser and communityname but not other fields', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const obj = new SurveyData();
    obj.set('surveyingOrganization', ORG);
    obj.set('surveyingUser', 'diana');
    obj.set('communityname', 'Villa B');
    obj.set('telephoneNumber', '555-0001');
    await obj.save(null, { useMasterKey: true });

    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.select('surveyingUser', 'communityname');
    const [result] = await q.find({ useMasterKey: true });

    expect(result.get('surveyingUser')).toBe('diana');
    expect(result.get('communityname')).toBe('Villa B');
    // telephoneNumber was not selected — Parse omits it from the projection
    expect(result.get('telephoneNumber')).toBeUndefined();
  });
});

// ─── FormSpecificationsV2 lookup by objectId ──────────────────────────────────
// DataCurationManager/index.js — loads the form definition when the source is
// a custom form result:
//
//   q.equalTo('objectId', formId)
//   q.find()

describe('form definition lookup — equalTo("objectId", id)', () => {
  afterEach(() => destroyAll('FormSpecificationsV2'));

  it('finds a FormSpecificationsV2 record by its objectId', async () => {
    const { objectId } = await Parse.Cloud.run(
      'postObjectsToClass',
      {
        parseClass: 'FormSpecificationsV2',
        localObject: {
          name: 'Health Survey',
          organizations: [ORG],
          fields: [],
          customForm: true,
          typeOfForm: ['Custom'],
          workflows: [],
          class: '',
        },
      },
      { useMasterKey: true },
    );

    const q = new Parse.Query('FormSpecificationsV2');
    q.equalTo('objectId', objectId);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(objectId);
    expect(results[0].get('name')).toBe('Health Survey');
  });

  it('returns an empty array for a non-existent objectId', async () => {
    const q = new Parse.Query('FormSpecificationsV2');
    q.equalTo('objectId', 'no-such-id-xyz');
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(0);
  });
});

// ─── SourceSelector — active-form filter ─────────────────────────────────────
// DataCurationManager/SourceSelector/index.js:
//
//   q.equalTo('organizations', org)
//   q.notEqualTo('active', 'false')
//   q.find()
//
// Records with active:'false' are soft-deleted; SourceSelector must exclude them.

describe('SourceSelector — notEqualTo("active", "false") excludes soft-deleted forms', () => {
  afterEach(() => destroyAll('FormSpecificationsV2'));

  it('returns active forms and excludes the soft-deleted one', async () => {
    // Two active forms (no active field set)
    await Promise.all([
      Parse.Cloud.run('postObjectsToClass', {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Active Form A', organizations: [ORG], fields: [], customForm: true, typeOfForm: ['Custom'], workflows: [], class: '' },
      }, { useMasterKey: true }),
      Parse.Cloud.run('postObjectsToClass', {
        parseClass: 'FormSpecificationsV2',
        localObject: { name: 'Active Form B', organizations: [ORG], fields: [], customForm: true, typeOfForm: ['Custom'], workflows: [], class: '' },
      }, { useMasterKey: true }),
    ]);

    // One soft-deleted form
    const { objectId } = await Parse.Cloud.run('postObjectsToClass', {
      parseClass: 'FormSpecificationsV2',
      localObject: { name: 'Deleted Form', organizations: [ORG], fields: [], customForm: true, typeOfForm: ['Custom'], workflows: [], class: '' },
    }, { useMasterKey: true });
    await Parse.Cloud.run('updateObject', {
      parseClass: 'FormSpecificationsV2',
      parseClassID: objectId,
      localObject: { active: 'false' },
    }, { useMasterKey: true });

    const q = new Parse.Query('FormSpecificationsV2');
    q.equalTo('organizations', ORG);
    q.notEqualTo('active', 'false');
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.get('active')).not.toBe('false'));
    expect(results.map((r) => r.get('name'))).not.toContain('Deleted Form');
  });
});

// ─── Main paginated fetch ─────────────────────────────────────────────────────
// DataCurationManager/index.js — the primary data load:
//
//   q.equalTo('surveyingOrganization', org)
//   q.descending('createdAt').limit(PAGE_SIZE).skip(page * PAGE_SIZE)
//   Promise.all([q.find(), q.count()])

describe('main paginated fetch — surveyingOrganization + limit/skip/count', () => {
  const PAGE_SIZE = 50;

  afterEach(() => destroyAll('SurveyData'));

  beforeEach(async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const records = Array.from({ length: 60 }, (_, i) => {
      const obj = new SurveyData();
      obj.set('surveyingOrganization', ORG);
      obj.set('surveyingUser', i < 30 ? 'alice' : 'bob');
      obj.set('communityname', i < 40 ? 'Villa A' : 'Villa B');
      return obj;
    });
    // one record for a different org — must never appear in results
    const other = new SurveyData();
    other.set('surveyingOrganization', OTHER_ORG);
    await Parse.Object.saveAll([...records, other], { useMasterKey: true });
  });

  it('find page 0 returns PAGE_SIZE records for the org', async () => {
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.descending('createdAt');
    q.limit(PAGE_SIZE);
    q.skip(0);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(PAGE_SIZE);
    results.forEach((r) => expect(r.get('surveyingOrganization')).toBe(ORG));
  });

  it('count returns total matching the org', async () => {
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    const count = await q.count({ useMasterKey: true });

    expect(count).toBe(60);
  });

  it('find page 1 (skip 50) returns the remaining 10 records', async () => {
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.descending('createdAt');
    q.limit(PAGE_SIZE);
    q.skip(PAGE_SIZE);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(10);
  });
});

// ─── Main fetch with optional filters ────────────────────────────────────────
// DataCurationManager/index.js applies optional equalTo filters when the user
// selects a surveyor or community in the FilterBar:
//
//   if (filters.surveyor) q.equalTo('surveyingUser', filters.surveyor)
//   if (filters.community) q.equalTo('communityname', filters.community)

describe('main fetch with optional filters — surveyingUser and communityname', () => {
  afterEach(() => destroyAll('SurveyData'));

  it('filters by surveyingUser returns only that user\'s records', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const aliceRecords = [1, 2, 3].map(() => {
      const obj = new SurveyData();
      obj.set('surveyingOrganization', ORG);
      obj.set('surveyingUser', 'alice');
      return obj;
    });
    const bobRecord = new SurveyData();
    bobRecord.set('surveyingOrganization', ORG);
    bobRecord.set('surveyingUser', 'bob');

    await Parse.Object.saveAll([...aliceRecords, bobRecord], { useMasterKey: true });

    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.equalTo('surveyingUser', 'alice');
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.get('surveyingUser')).toBe('alice'));
  });

  it('filters by communityname returns only records from that community', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const villaA = [1, 2].map(() => {
      const obj = new SurveyData();
      obj.set('surveyingOrganization', ORG);
      obj.set('communityname', 'Villa A');
      return obj;
    });
    const villaB = new SurveyData();
    villaB.set('surveyingOrganization', ORG);
    villaB.set('communityname', 'Villa B');

    await Parse.Object.saveAll([...villaA, villaB], { useMasterKey: true });

    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.equalTo('communityname', 'Villa A');
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.get('communityname')).toBe('Villa A'));
  });
});

// ─── Date-range filter ────────────────────────────────────────────────────────
// DataCurationManager/index.js:
//
//   if (filters.from) q.greaterThanOrEqualTo('createdAt', filters.from)
//   if (filters.to)   q.lessThanOrEqualTo('createdAt', filters.to)

describe('date-range filter — greaterThanOrEqualTo / lessThanOrEqualTo on createdAt', () => {
  afterEach(() => destroyAll('SurveyData'));

  it('a far-future "from" date returns no records', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const obj = new SurveyData();
    obj.set('surveyingOrganization', ORG);
    await obj.save(null, { useMasterKey: true });

    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // +1 year
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.greaterThanOrEqualTo('createdAt', farFuture);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(0);
  });

  it('a far-past "to" date returns no records', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const obj = new SurveyData();
    obj.set('surveyingOrganization', ORG);
    await obj.save(null, { useMasterKey: true });

    const farPast = new Date(0); // epoch
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.lessThanOrEqualTo('createdAt', farPast);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(0);
  });

  it('a range spanning the record\'s createdAt includes it', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const obj = new SurveyData();
    obj.set('surveyingOrganization', ORG);
    await obj.save(null, { useMasterKey: true });

    const from = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    const to = new Date(Date.now() + 1000 * 60 * 60);   // 1 hour ahead

    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.greaterThanOrEqualTo('createdAt', from);
    q.lessThanOrEqualTo('createdAt', to);
    const results = await q.find({ useMasterKey: true });

    expect(results).toHaveLength(1);
  });
});

// ─── CommunityAudit — bulk rename (record.set + record.save) ─────────────────
// DataCurationManager/CommunityAudit/index.js applyCanonical:
//
//   q.equalTo('surveyingOrganization', org)
//   q.equalTo('communityname', variant)
//   q.find()
//   recs.forEach(r => { r.set('communityname', target); r.save(); })
//
// This is the only place in the app where a record is mutated directly via
// the client SDK (not via a cloud function). The integration test proves that
// Parse.Object.save() persists the change through the server.

describe('CommunityAudit bulk rename — record.set(field).save() persists the change', () => {
  afterEach(() => destroyAll('SurveyData'));

  it('renames communityname on all matching records', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');
    const records = [1, 2, 3].map(() => {
      const obj = new SurveyData();
      obj.set('surveyingOrganization', ORG);
      obj.set('communityname', 'Villa Norte');
      return obj;
    });
    await Parse.Object.saveAll(records, { useMasterKey: true });

    // Fetch, rename, save — mirrors applyCanonical
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.equalTo('communityname', 'Villa Norte');
    const toRename = await q.find({ useMasterKey: true });

    await Promise.all(toRename.map((r) => {
      r.set('communityname', 'Villa del Norte');
      return r.save(null, { useMasterKey: true });
    }));

    // Verify all three are renamed
    const updated = await new Parse.Query('SurveyData')
      .equalTo('surveyingOrganization', ORG)
      .find({ useMasterKey: true });

    expect(updated).toHaveLength(3);
    updated.forEach((r) => expect(r.get('communityname')).toBe('Villa del Norte'));
  });

  it('does not rename records from a different org', async () => {
    const SurveyData = Parse.Object.extend('SurveyData');

    const ours = new SurveyData();
    ours.set('surveyingOrganization', ORG);
    ours.set('communityname', 'Villa Norte');

    const theirs = new SurveyData();
    theirs.set('surveyingOrganization', OTHER_ORG);
    theirs.set('communityname', 'Villa Norte');

    await Parse.Object.saveAll([ours, theirs], { useMasterKey: true });

    // Rename scoped to ORG only
    const q = new Parse.Query('SurveyData');
    q.equalTo('surveyingOrganization', ORG);
    q.equalTo('communityname', 'Villa Norte');
    const toRename = await q.find({ useMasterKey: true });
    await Promise.all(toRename.map((r) => {
      r.set('communityname', 'Villa del Norte');
      return r.save(null, { useMasterKey: true });
    }));

    // The other-org record must be unchanged
    const theirRecord = await new Parse.Query('SurveyData')
      .equalTo('surveyingOrganization', OTHER_ORG)
      .first({ useMasterKey: true });

    expect(theirRecord.get('communityname')).toBe('Villa Norte');
  });
});
