import { SegmentedControl, Skeleton } from 'app/impacto-design-system';
import {
  detectDuplicates,
  flagAnomalies,
  missingKeyFieldsQuery,
  resolveParseClass,
  scoreRecord,
  sourceHasClientPointer,
  unresolvedParentQuery,
} from 'app/modules/data-quality';
import { loadOrganizationScope } from 'app/modules/organization';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useMemo, useState } from 'react';

import CommunityAudit from './CommunityAudit';
import DuplicateResolver from './DuplicateResolver';
import FilterBar from './FilterBar';
import styles from './index.module.css';
import RecordInspector from './RecordInspector';
import RecordsTable from './RecordsTable';
import SourceSelector from './SourceSelector';

// ─── Data-quality definitions ────────────────────────────────────────────────

// None of these live here. app/modules/data-quality is the single definition of
// what each data-quality signal means: the dashboard's triage loader scores
// against the same completeness fields this screen does, and a second copy is
// how the two screens would drift. The module also stays free of React and CSS
// so the dashboard can reach it without pulling this epic's view layer in —
// which is why RecordsTable imports its scoring from there directly rather than
// from this file, breaking what was an import cycle.
//
// Re-exported here so importers written against this epic keep resolving.
export {
  computeCompleteness,
  computeFormResultsCompleteness,
  computeSurveyCompleteness,
  detectDuplicates,
  flagAnomalies,
  scoreRecord,
  sourceHasClientPointer,
  SURVEY_COMPLETENESS_FIELDS,
} from 'app/modules/data-quality';

// ─── Query configuration ─────────────────────────────────────────────────────

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

const EMPTY_FILTERS = {
  search: '', surveyor: '', community: '', from: null, to: null, status: 'all', completeness: 'all',
};

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

  // Every string this organization's records may carry, not just the one on the
  // account. Records hold what was COLLECTED, and one organization's are spread
  // across several strings — in production DR Missions has 11 rows under
  // "DR Missions" and 611 under "DRMT". Filtering on one hid the rest silently.
  // Starts as [org] so the first render is scoped rather than unscoped.
  const [orgValues, setOrgValues] = useState(org ? [org] : []);
  useEffect(() => {
    if (!org) return undefined;
    let ignore = false;
    loadOrganizationScope(Parse, org).then((values) => {
      if (!ignore) setOrgValues(values);
    });
    return () => { ignore = true; };
  }, [org]);

  // The dashboard's needs-attention queue deep-links here as
  // /data/data-curation?signal=<name>. Optional-chained: this component also
  // renders outside a router context.
  const router = useRouter();
  const signal = router?.query?.signal || '';

  // Every signal predicate in app/modules/data-quality reads SurveyData and only
  // SurveyData — the key fields and the offline household link exist on no other
  // class. The signal lives in the URL while the source lives in component
  // state, so the signal outlives a source change: honouring a stale one would
  // hand a user who asked for Vitals a page of SurveyData rows, with nothing on
  // screen to tell them. Derived once, so the fetch below and the notice above
  // the figures cannot disagree about which narrowing is in force.
  const activeSignal = resolveParseClass(source) === 'SurveyData' ? signal : '';

  // Derive surveyor + community filter options from a sample of records.
  // (Parse `distinct()` requires the Master Key, unavailable to the client SDK,
  //  so we sample up to 1000 rows and reduce to distinct values in the browser.)
  useEffect(() => {
    if (!org) return;
    const parseClass = resolveParseClass(source);
    const q = new Parse.Query(parseClass);
    q.containedIn('surveyingOrganization', orgValues);
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
  }, [source, org, orgValues]);

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
    const signalQuery = SIGNAL_QUERIES[activeSignal];
    const q = signalQuery
      ? signalQuery({ Parse, orgValues })
      : new Parse.Query(parseClass).containedIn('surveyingOrganization', orgValues);
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
  }, [source, filters, page, org, orgValues, activeSignal]);

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
            { label: t('data_curation_tab_records'), value: 'records' },
            { label: t('data_curation_tab_community_audit'), value: 'community-audit' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === 'records' && (
        <>
          {/* Source selector */}
          <SourceSelector source={source} orgValues={orgValues} onChange={handleSourceChange} />

          {/* Active signal filter notice — sits directly above the figures it qualifies */}
          {SIGNAL_NOTICE_KEYS[activeSignal] && (
            <p className={styles.signalNotice}>{t(SIGNAL_NOTICE_KEYS[activeSignal])}</p>
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
      {view === 'community-audit' && <CommunityAudit orgValues={orgValues} />}
    </div>
  );
}
