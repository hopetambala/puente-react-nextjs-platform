import { Button, Modal, Panel } from 'app/impacto-design-system';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.css';

// Pure edit-distance — exported for tests
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : (j === 0 ? i : 0))));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Group names where edit distance ≤ 2
export function groupSimilarNames(names) {
  const groups = [];
  const used = new Set();
  names.forEach((name, i) => {
    if (used.has(i)) return;
    const group = [name];
    used.add(i);
    names.forEach((other, j) => {
      if (j <= i || used.has(j)) return;
      if (levenshtein(name, other) <= 2) {
        group.push(other);
        used.add(j);
      }
    });
    if (group.length > 1) groups.push(group);
  });
  return groups;
}

const AUDIT_CLASSES = ['SurveyData', 'EvaluationMedical', 'Vitals', 'EnvironmentalHealth'];

export default function CommunityAudit({ org }) {
  const [groups, setGroups] = useState([]);
  const [canonical, setCanonical] = useState({});
  const [applying, setApplying] = useState(null);
  // The group index awaiting confirmation, set when Apply is clicked. Holds the
  // confirm dialog open until the user explicitly confirms the bulk rename.
  const [pendingGroup, setPendingGroup] = useState(null);

  useEffect(() => {
    if (!org) return;
    async function load() {
      // Parse `distinct()` needs the Master Key (client SDK can't use it), so
      // we sample records per class and reduce to distinct community names here.
      const all = await Promise.all(
        AUDIT_CLASSES.map(async (cls) => {
          const q = new Parse.Query(cls);
          q.equalTo('surveyingOrganization', org);
          q.select('communityname');
          q.limit(1000);
          const recs = await q.find().catch(() => []);
          return recs.map((r) => r.get('communityname'));
        }),
      );
      const names = [...new Set(all.flat().filter(Boolean))];
      setGroups(groupSimilarNames(names));
    }
    load();
  }, [org]);

  async function applyCanonical() {
    if (pendingGroup === null) return;
    const gi = pendingGroup;
    const group = groups[gi];
    const target = canonical[gi] || group[0];
    setApplying(gi);
    setPendingGroup(null);
    try {
      await Promise.all(AUDIT_CLASSES.map(async (cls) => {
        const variants = group.filter((n) => n !== target);
        await Promise.all(variants.map(async (variant) => {
          const q = new Parse.Query(cls);
          q.equalTo('surveyingOrganization', org);
          q.equalTo('communityname', variant);
          const recs = await q.find().catch(() => []);
          await Promise.all(recs.map((r) => {
            r.set('communityname', target);
            return r.save();
          }));
        }));
      }));
      setGroups((prev) => prev.filter((_, i) => i !== gi));
    } finally {
      setApplying(null);
    }
  }

  const pendingTarget = pendingGroup !== null
    ? (canonical[pendingGroup] || groups[pendingGroup][0])
    : '';

  return (
    <Panel title="Community Audit">
      <Modal
        open={pendingGroup !== null}
        handleClose={() => setPendingGroup(null)}
        text={`Rename all records in this group to “${pendingTarget}”? This updates every matching record and cannot be undone.`}
        actionText="Rename records"
        intent="primary"
        action={applyCanonical}
      />
      {groups.length === 0 ? (
        <p className={styles.empty}>No similar community names detected.</p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group, gi) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={gi} className={styles.group}>
              <div className={styles.variants}>
                {group.map((name) => (
                  <label key={name} className={styles.variant}>
                    <input
                      type="radio"
                      name={`canonical-${gi}`}
                      checked={(canonical[gi] || group[0]) === name}
                      onChange={() => setCanonical((prev) => ({ ...prev, [gi]: name }))}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
              <Button
                text={applying === gi ? 'Applying…' : 'Apply'}
                isSmall
                isDisabled={applying === gi}
                onClick={() => setPendingGroup(gi)}
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
