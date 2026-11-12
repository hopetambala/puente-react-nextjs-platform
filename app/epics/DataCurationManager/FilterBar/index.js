import { SegmentedControl } from 'app/impacto-design-system';
import Icon from 'app/impacto-design-system/icon';
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

let idCounter = 0;
function fieldIds() {
  idCounter += 1;
  const base = `curation-filter-${idCounter}`;
  return { search: `${base}-search`, surveyor: `${base}-surveyor`, community: `${base}-community` };
}

export default function FilterBar({ surveyors, communities, onFilterChange, loading }) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [surveyor, setSurveyor] = useState('');
  const [community, setCommunity] = useState('');
  const [status, setStatus] = useState('all');
  const [completeness, setCompleteness] = useState('all');
  const debounceRef = useRef(null);
  // React 17 has no useId. One bar per page, so fixed ids would do today, but
  // a second instance (a saved-filter preview, a story) would collide.
  const ids = useMemo(() => fieldIds(), []);

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
    // A search landmark: the filters are how a coordinator finds a record, and
    // a screen-reader user can jump straight to them. A role rather than the
    // <search> element, which Safari before 17 and jsdom don't know.
    <div role="search" className={styles.filterStrip} aria-label={t('data_curation_filters_label')}>
      <div className={styles.filterLeft}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={ids.search}>{t('data_curation_search_label')}</label>
          <div className={styles.search}>
            <Icon name="search" size="small" className={styles.searchIcon} />
            <input
              id={ids.search}
              type="search"
              className={styles.searchInput}
              placeholder={t('data_curation_search_placeholder')}
              value={search}
              onChange={handleSearch}
              disabled={loading}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={ids.surveyor}>{t('field_surveyor')}</label>
          <select id={ids.surveyor} className={styles.filterSelect} value={surveyor} onChange={handleSurveyor} disabled={loading}>
            <option value="">{t('data_curation_all_surveyors')}</option>
            {surveyors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={ids.community}>{t('field_community')}</label>
          <select id={ids.community} className={styles.filterSelect} value={community} onChange={handleCommunity} disabled={loading}>
            <option value="">{t('data_curation_all_communities')}</option>
            {communities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.filterRight}>
        <SegmentedControl
          label={t('data_curation_filter_status')}
          options={statusOptions}
          value={status}
          onChange={handleStatus}
        />
        <SegmentedControl
          label={t('data_curation_col_completeness')}
          options={completenessOptions}
          value={completeness}
          onChange={handleCompleteness}
        />
      </div>
    </div>
  );
}
