import { Button, Skeleton, SegmentedControl } from 'app/impacto-design-system';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useMemo, useState } from 'react';

import CommunityAudit from './CommunityAudit';
import DuplicateResolver from './DuplicateResolver';
import FilterBar from './FilterBar';
import RecordInspector from './RecordInspector';
import RecordsTable from './RecordsTable';
import SourceSelector from './SourceSelector';
import styles from './index.module.css';

// ─── Completeness scoring ────────────────────────────────────────────────────

export const SURVEY_COMPLETENESS_FIELDS = [
  'fname', 'lname', 'dob', 'sex',
  'householdId', 'communityname',
  'surveyingUser', 'telephoneNumber',
];

// The clinical extension classes share none of SurveyData's identity fields —
// they reach the person through a `client` pointer. Each is scored against the
// readings a surveyor is expected to record, deliberately excluding metadata
// (surveyingUser, surveyingOrganization, client, createdAt): a well-attributed
// record with no readings is not a complete one. Which fields count as required
// is a domain call — adjust these lists rather than adding metadata back.
const SOURCE_COMPLETENESS_FIELDS = {
  'survey-data': SURVEY_COMPLETENESS_FIELDS,
  vitals: ['bloodPressure', 'pulse', 'temp', 'weight', 'height', 'respRate'],
  'eval-medical': ['AssessmentandEvaluation', 'part_of_body', 'duration', 'condition_progression', 'planOfAction'],
  'env-health': ['houseMaterial', 'waterAccess', 'bathroomAccess', 'electricityAccess', 'foodSecurity', 'latrineAccess'],
};

function completenessFieldsForSource(source) {
  return SOURCE_COMPLETENESS_FIELDS[source] || SURVEY_COMPLETENESS_FIELDS;
}

function computeCompletenessForSource(record, source) {
  const fields = completenessFieldsForSource(source);
  const filled = fields.filter((f) => {
    const v = record.get(f);
    return v !== null && v !== undefined && v !== '';
  });
  return Math.round((filled.length / fields.length) * 100);
}

export function computeSurveyCompleteness(record) {
  return computeCompletenessForSource(record, 'survey-data');
}

const FORM_RESULT_META_FIELDS = ['surveyingUser', 'surveyingOrganization', 'client', 'createdAt'];

export function computeFormResultsCompleteness(record, formDefinition) {
  const answered = new Set((record.get('fields') || []).map((f) => f.title));
  const expected = (formDefinition?.get('fields') || []).map((f) => f.formikKey).filter(Boolean);
  const metaScore = FORM_RESULT_META_FIELDS.filter((f) => !!(f === 'createdAt' ? (record.createdAt || record.get(f)) : record.get(f))).length / FORM_RESULT_META_FIELDS.length;
  const fieldScore = expected.length > 0
    ? expected.filter((k) => answered.has(k)).length / expected.length
    : 1;
  return {
    meta: Math.round(metaScore * 100),
    fields: Math.round(fieldScore * 100),
    overall: Math.round((metaScore * 0.3 + fieldScore * 0.7) * 100),
  };
}

// Keep legacy export name so existing tests referencing it still compile
export const computeCompleteness = computeSurveyCompleteness;

// ─── Duplicate / anomaly detection ──────────────────────────────────────────

export function detectDuplicates(records) {
  const seen = {};
  const dups = new Set();
  records.forEach((r) => {
    const hid = r.get('householdId');
    if (!hid) return;
    const day = r.createdAt ? r.createdAt.toISOString().slice(0, 10) : 'unknown';
    const key = `${hid}__${day}`;
    if (seen[key]) {
      dups.add(seen[key]);
      dups.add(r.id);
    } else {
      seen[key] = r.id;
    }
  });
  return dups;
}

// Scores one record with the metric its own source has. Custom forms carry their
// own (30% metadata + 70% answered-vs-expected); every other source is scored
// against its class's field list. Routing every completeness read through here
// keeps the summary bar, the anomaly flags, the completeness filter and the
// per-row bar from disagreeing with each other.
export function scoreRecord(record, source, formDefinition) {
  if (source.startsWith('form-results:')) {
    return computeFormResultsCompleteness(record, formDefinition).overall;
  }
  return computeCompletenessForSource(record, source);
}

export function flagAnomalies(records, source = 'survey-data', formDefinition = null) {
  const anomalies = new Set();
  records.forEach((r) => {
    if (scoreRecord(r, source, formDefinition) < 60) anomalies.add(r.id);
  });
  return anomalies;
}

// ─── Source resolution ───────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const EMPTY_FILTERS = {
  search: '', surveyor: '', community: '', from: null, to: null, status: 'all', completeness: 'all',
};

function resolveParseClass(source) {
  if (source === 'survey-data') return 'SurveyData';
  if (source === 'eval-medical') return 'EvaluationMedical';
  if (source === 'vitals') return 'Vitals';
  if (source === 'env-health') return 'HistoryEnvironmentalHealth';
  if (source.startsWith('form-results:')) return 'FormResults';
  return 'SurveyData';
}

// Whether this source's class stores only its own data and reaches the person
// through a `client` pointer. Derived from resolveParseClass so the query's
// include() and RecordsTable's person/community reads cannot drift apart —
// including for an unrecognised source, which resolveParseClass sends to
// SurveyData and which therefore genuinely carries its own person fields.
export function sourceHasClientPointer(source) {
  return resolveParseClass(source) !== 'SurveyData';
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export default function DataCurationManager() {
  const { t } = useTranslation('common');

  const [view, setView] = useState('records');
  const [source, setSource] = useState('survey-data');
  const [formDefinition, setFormDefinition] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [duplicateGroup, setDuplicateGroup] = useState(null);
  const [dups, setDups] = useState(new Set());
  // Derived, not stored: the form definition arrives from its own effect after
  // the records do, and a stored set would keep pre-definition scores.
  const anomalies = useMemo(
    () => flagAnomalies(records, source, formDefinition),
    [records, source, formDefinition],
  );
  const [surveyors, setSurveyors] = useState([]);
  const [communities, setCommunities] = useState([]);

  const user = retrieveCurrentUserAsyncFunction();
  const org = user ? user.get('organization') : '';

  // Derive surveyor + community filter options from a sample of records.
  // (Parse `distinct()` requires the Master Key, unavailable to the client SDK,
  //  so we sample up to 1000 rows and reduce to distinct values in the browser.)
  useEffect(() => {
    if (!org) return;
    const parseClass = resolveParseClass(source);
    const q = new Parse.Query(parseClass);
    q.equalTo('surveyingOrganization', org);
    q.select('surveyingUser', 'communityname');
    q.limit(1000);
    q.find()
      .then((sample) => {
        const sv = new Set();
        const cm = new Set();
        sample.forEach((r) => {
          if (r.get('surveyingUser')) sv.add(r.get('surveyingUser'));
          if (r.get('communityname')) cm.add(r.get('communityname'));
        });
        setSurveyors([...sv].sort());
        setCommunities([...cm].sort());
      })
      .catch(() => {});
  }, [source, org]);

  // Load FormResults form definition when source is a custom form
  useEffect(() => {
    if (!source.startsWith('form-results:')) { setFormDefinition(null); return; }
    const formId = source.replace('form-results:', '');
    const q = new Parse.Query('FormSpecificationsV2');
    q.equalTo('objectId', formId);
    q.find().then((results) => setFormDefinition(results[0] || null)).catch(() => setFormDefinition(null));
  }, [source]);

  // Main paginated fetch
  useEffect(() => {
    if (!org) return;
    setLoading(true);
    const parseClass = resolveParseClass(source);
    const q = new Parse.Query(parseClass);
    q.equalTo('surveyingOrganization', org);
    // Every class except SurveyData holds no person or community fields of its
    // own and points at the SurveyData record via `client`. include() resolves
    // that pointer in the same round-trip; without it the pointer arrives
    // unfetched and every read through it is undefined.
    if (sourceHasClientPointer(source)) q.include('client');
    if (source.startsWith('form-results:')) {
      q.equalTo('formSpecificationsId', source.replace('form-results:', ''));
    }
    if (filters.surveyor) q.equalTo('surveyingUser', filters.surveyor);
    if (filters.community) q.equalTo('communityname', filters.community);
    if (filters.from) q.greaterThanOrEqualTo('createdAt', filters.from);
    if (filters.to) q.lessThanOrEqualTo('createdAt', filters.to);
    q.descending('createdAt').limit(PAGE_SIZE).skip(page * PAGE_SIZE);

    Promise.all([q.find(), q.count()])
      .then(([results, count]) => {
        setRecords(results);
        setTotal(count);
        setDups(detectDuplicates(results));
      })
      .catch(() => { setRecords([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [source, filters, page, org]);

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    setPage(0);
    setSelectedRecord(null);
    setDuplicateGroup(null);
    // Filters are class-specific: communityname exists only on SurveyData, so a
    // leftover community filter matches zero rows on any other class and reads
    // as "no data collected" rather than surfacing an error.
    setFilters(EMPTY_FILTERS);
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  // Find the duplicate partner of a record (same householdId + day)
  function findDuplicatePartner(record) {
    const hid = record.get('householdId');
    const day = record.createdAt ? record.createdAt.toISOString().slice(0, 10) : null;
    return records.find((r) => r.id !== record.id
      && r.get('householdId') === hid
      && (r.createdAt ? r.createdAt.toISOString().slice(0, 10) : null) === day);
  }

  const handleDuplicateGroup = (record) => {
    const partner = findDuplicatePartner(record);
    if (partner) setDuplicateGroup({ a: record, b: partner });
  };

  const refetch = () => setFilters((prev) => ({ ...prev }));

  // Client-side filter for status/completeness after fetch
  const visibleRecords = records.filter((r) => {
    if (filters.status === 'duplicates' && !dups.has(r.id)) return false;
    if (filters.status === 'anomalies' && !anomalies.has(r.id)) return false;
    if (filters.status === 'clean' && (dups.has(r.id) || anomalies.has(r.id))) return false;
    const pct = scoreRecord(r, source, formDefinition);
    if (filters.completeness === 'high' && pct < 80) return false;
    if (filters.completeness === 'low' && pct >= 60) return false;
    return true;
  });

  const avgCompleteness = records.length
    ? Math.round(records.reduce((sum, r) => sum + scoreRecord(r, source, formDefinition), 0) / records.length)
    : 0;

  return (
    <div className={styles.manager}>
      <div className={styles.viewTabs}>
        <SegmentedControl
          options={[
            { label: 'Records', value: 'records' },
            { label: 'Community Audit', value: 'community-audit' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === 'records' && (
        <>
          {/* Source selector */}
          <SourceSelector source={source} org={org} onChange={handleSourceChange} />

          {/* Summary bar */}
          <div className={styles.summaryBar}>
            {loading ? (
              <>
                <Skeleton width={80} height={14} />
                <Skeleton width={100} height={14} />
                <Skeleton width={80} height={14} />
                <Skeleton width={90} height={14} />
              </>
            ) : (
              <>
                <span>{records.length} {t('data_curation_records')}</span>
                <span>{avgCompleteness}% {t('data_curation_avg')}</span>
                <span>{dups.size} {t('data_curation_dups')}</span>
                <span>{anomalies.size} {t('data_curation_anomalies')}</span>
              </>
            )}
          </div>

          {/* Filter bar */}
          <FilterBar
            surveyors={surveyors}
            communities={communities}
            onFilterChange={handleFilterChange}
            loading={loading}
          />

          {/* Main content: DuplicateResolver or RecordsTable */}
          <div className="cl-dlite-relative">
            {duplicateGroup ? (
              <DuplicateResolver
                recordA={duplicateGroup.a}
                recordB={duplicateGroup.b}
                onResolved={() => { setDuplicateGroup(null); refetch(); }}
              />
            ) : (
              <RecordsTable
                source={source}
                records={visibleRecords}
                total={total}
                page={page}
                dups={dups}
                anomalies={anomalies}
                onSelectRecord={setSelectedRecord}
                onPageChange={setPage}
                onDuplicateGroup={handleDuplicateGroup}
                loading={loading}
                formDefinition={formDefinition}
              />
            )}

            {/* Record inspector slide-in */}
            {selectedRecord && (
              <RecordInspector
                record={selectedRecord}
                source={source}
                formDefinition={formDefinition}
                onClose={() => setSelectedRecord(null)}
                onSaved={(updated) => {
                  setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  setSelectedRecord(null);
                }}
              />
            )}
          </div>
        </>
      )}

      {/* Community audit panel */}
      {view === 'community-audit' && <CommunityAudit org={org} />}
    </div>
  );
}
