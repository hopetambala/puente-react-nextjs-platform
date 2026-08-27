import { SegmentedControl, Skeleton } from 'app/impacto-design-system';
import {
  detectDuplicates,
  missingKeyFieldsQuery,
  SURVEY_COMPLETENESS_FIELDS,
  unresolvedParentQuery,
} from 'app/modules/data-quality';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import CommunityAudit from './CommunityAudit';
import DuplicateResolver from './DuplicateResolver';
import FilterBar from './FilterBar';
import styles from './index.module.css';
import RecordInspector from './RecordInspector';
import RecordsTable from './RecordsTable';
import SourceSelector from './SourceSelector';

// ─── Completeness scoring ────────────────────────────────────────────────────

// The field list itself lives in app/modules/data-quality: the dashboard's
// triage loader scores against the same definition, and a second copy here is
// how the two screens would drift. Same for detectDuplicates, which the
// dashboard reduces its sampled duplicate count with. Re-exported for existing
// importers.
export { detectDuplicates, SURVEY_COMPLETENESS_FIELDS };

export function computeSurveyCompleteness(record) {
  const filled = SURVEY_COMPLETENESS_FIELDS.filter((f) => {
    const v = record.get(f);
    return v !== null && v !== undefined && v !== '';
  });
  return Math.round((filled.length / SURVEY_COMPLETENESS_FIELDS.length) * 100);
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

// ─── Anomaly detection ───────────────────────────────────────────────────────

export function flagAnomalies(records) {
  const anomalies = new Set();
  records.forEach((r) => {
    if (computeSurveyCompleteness(r) < 60) anomalies.add(r.id);
  });
  return anomalies;
}

// ─── Source resolution ───────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// The dashboard's needs-attention queue deep-links here with the signal name it
// counted; each one resolves to the shared predicate that produced that count,
// so the number the user clicked and the rows they land on stay the same set.
//
// Null-prototype, because the key comes straight off a user-supplied URL: on a
// plain object literal, ?signal=constructor (or toString, valueOf,
// hasOwnProperty) inherits a truthy non-predicate from Object.prototype and gets
// called as though it were a query builder. With no prototype, only genuinely
// registered signals resolve and everything else falls through to the ordinary
// org-scoped query.
const SIGNAL_QUERIES = Object.assign(Object.create(null), {
  'unresolved-parent': unresolvedParentQuery,
  'missing-key-fields': missingKeyFieldsQuery,
});

// A filtered view must not present itself as unfiltered: the figures in the
// summary bar are computed off the narrowed page, so each signal names its own
// narrowing in prose directly above them. One whole sentence per signal rather
// than a shared frame with the signal name interpolated in — word order differs
// by language, and six locales ship. Null-prototype for the same reason as
// SIGNAL_QUERIES: the key comes off a user-supplied URL.
const SIGNAL_NOTICE_KEYS = Object.assign(Object.create(null), {
  'unresolved-parent': 'data_curation_filtered_unresolved-parent',
  'missing-key-fields': 'data_curation_filtered_missing-key-fields',
});

function resolveParseClass(source) {
  if (source === 'survey-data') return 'SurveyData';
  if (source === 'eval-medical') return 'EvaluationMedical';
  if (source === 'vitals') return 'Vitals';
  if (source === 'env-health') return 'EnvironmentalHealth';
  if (source.startsWith('form-results:')) return 'FormResults';
  return 'SurveyData';
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export default function DataCurationManager() {
  const { t } = useTranslation('common');

  const [view, setView] = useState('records');
  const [source, setSource] = useState('survey-data');
  const [formDefinition, setFormDefinition] = useState(null);
  const [filters, setFilters] = useState({
    search: '', surveyor: '', community: '', from: null, to: null, status: 'all', completeness: 'all',
  });
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [duplicateGroup, setDuplicateGroup] = useState(null);
  const [dups, setDups] = useState(new Set());
  const [anomalies, setAnomalies] = useState(new Set());
  const [surveyors, setSurveyors] = useState([]);
  const [communities, setCommunities] = useState([]);

  const user = retrieveCurrentUserAsyncFunction();
  const org = user ? user.get('organization') : '';

  // The dashboard's needs-attention queue deep-links here as
  // /data/data-curation?signal=<name>. Optional-chained: this component also
  // renders outside a router context.
  const router = useRouter();
  const signal = router?.query?.signal || '';

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
    // Signal-scoped queues build off the shared predicates in
    // app/modules/data-quality, never off a copy. Constraining the QUERY (rather
    // than filtering the 50 fetched rows) is what lets count() honour the signal
    // too — and it adds no round trip, since find() and count() still run as the
    // one concurrent pair.
    const signalQuery = SIGNAL_QUERIES[signal];
    const q = signalQuery
      ? signalQuery({ Parse, org })
      : new Parse.Query(parseClass).equalTo('surveyingOrganization', org);
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
        setAnomalies(flagAnomalies(results));
      })
      .catch(() => { setRecords([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [source, filters, page, org, signal]);

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    setPage(0);
    setSelectedRecord(null);
    setDuplicateGroup(null);
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
    const pct = computeSurveyCompleteness(r);
    if (filters.completeness === 'high' && pct < 80) return false;
    if (filters.completeness === 'low' && pct >= 60) return false;
    return true;
  });

  const avgCompleteness = records.length
    ? Math.round(records.reduce((sum, r) => sum + computeSurveyCompleteness(r), 0) / records.length)
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

          {/* Active signal filter notice — sits directly above the figures it qualifies */}
          {SIGNAL_NOTICE_KEYS[signal] && (
            <p className={styles.signalNotice}>{t(SIGNAL_NOTICE_KEYS[signal])}</p>
          )}

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
