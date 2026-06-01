import { SegmentedControl } from 'app/impacto-design-system';
import { useEffect, useRef, useState } from 'react';

import styles from './index.module.css';

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'anomalies',  label: 'Anomalies' },
  { value: 'clean',      label: 'Clean' },
];

const COMPLETENESS_OPTIONS = [
  { value: 'all',  label: 'All' },
  { value: 'high', label: '≥ 80%' },
  { value: 'low',  label: '< 60%' },
];

export default function FilterBar({ surveyors, communities, onFilterChange, loading }) {
  const [search, setSearch] = useState('');
  const [surveyor, setSurveyor] = useState('');
  const [community, setCommunity] = useState('');
  const [status, setStatus] = useState('all');
  const [completeness, setCompleteness] = useState('all');
  const debounceRef = useRef(null);

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
            placeholder="Search records…"
            value={search}
            onChange={handleSearch}
            disabled={loading}
          />
        </div>

        <select className={styles.filterSelect} value={surveyor} onChange={handleSurveyor} disabled={loading}>
          <option value="">All surveyors</option>
          {surveyors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className={styles.filterSelect} value={community} onChange={handleCommunity} disabled={loading}>
          <option value="">All communities</option>
          {communities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.filterRight}>
        <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={handleStatus} />
        <SegmentedControl options={COMPLETENESS_OPTIONS} value={completeness} onChange={handleCompleteness} />
      </div>
    </div>
  );
}
