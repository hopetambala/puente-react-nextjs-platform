import { SegmentedControl } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';

import styles from './index.module.css';

// Value and key are paired here, but the label is resolved inside the component
// below. A module-level constant is evaluated once, at import, before any locale
// is known — labels built here would be frozen in whichever language happened to
// load first. Keys stay literal so `grep data_curation_status_clean` finds both
// the use and the catalog entry.
const STATUS_OPTIONS = [
  { value: 'all',        key: 'data_curation_status_all' },
  { value: 'duplicates', key: 'data_curation_status_duplicates' },
  { value: 'anomalies',  key: 'data_curation_status_anomalies' },
  { value: 'clean',      key: 'data_curation_status_clean' },
];

// The thresholds carry no words, but they are not locale-independent: Spanish
// sets a space before the percent sign. They go through `t()` for the same
// reason the rest do.
const COMPLETENESS_OPTIONS = [
  { value: 'all',  key: 'data_curation_completeness_all' },
  { value: 'high', key: 'data_curation_completeness_high' },
  { value: 'low',  key: 'data_curation_completeness_low' },
];

export default function FilterBar({ surveyors, communities, onFilterChange, loading }) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [surveyor, setSurveyor] = useState('');
  const [community, setCommunity] = useState('');
  const [status, setStatus] = useState('all');
  const [completeness, setCompleteness] = useState('all');
  const debounceRef = useRef(null);

  const statusOptions = useMemo(
    () => STATUS_OPTIONS.map(({ value, key }) => ({ value, label: t(key) })),
    [t],
  );
  const completenessOptions = useMemo(
    () => COMPLETENESS_OPTIONS.map(({ value, key }) => ({ value, label: t(key) })),
    [t],
  );

  function notify(patch) {
    onFilterChange({ search, surveyor, community, status, completeness, ...patch });
  }

  function handleSearch(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => notify({ search: val }), 300);
  }

  function handleSurveyor(e) {
    const val = e.target.value;
    setSurveyor(val);
    notify({ surveyor: val });
  }

  function handleCommunity(e) {
    const val = e.target.value;
    setCommunity(val);
    notify({ community: val });
  }

  function handleStatus(val) {
    setStatus(val);
    notify({ status: val });
  }

  function handleCompleteness(val) {
    setCompleteness(val);
    notify({ completeness: val });
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className={styles.filterStrip}>
      <div className={styles.filterLeft}>
        <div className={styles.search}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('data_curation_search_placeholder')}
            value={search}
            onChange={handleSearch}
            disabled={loading}
          />
        </div>

        <select className={styles.filterSelect} value={surveyor} onChange={handleSurveyor} disabled={loading}>
          <option value="">{t('data_curation_all_surveyors')}</option>
          {surveyors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className={styles.filterSelect} value={community} onChange={handleCommunity} disabled={loading}>
          <option value="">{t('data_curation_all_communities')}</option>
          {communities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.filterRight}>
        <SegmentedControl options={statusOptions} value={status} onChange={handleStatus} />
        <SegmentedControl options={completenessOptions} value={completeness} onChange={handleCompleteness} />
      </div>
    </div>
  );
}
