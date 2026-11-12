import { Button, Modal, Panel } from 'app/impacto-design-system';
import { settleWithin } from 'app/modules/async/settleWithin';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.css';

// Pure edit-distance — exported for tests
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  // Base cases: turning a string into the empty string costs one delete per
  // character, so row 0 counts up the length of b and column 0 the length of a.
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
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

/**
 * How many records the rename rewrites per round trip.
 *
 * The rename previously set no limit at all, so Parse applied its server
 * default of 100 while the confirm dialog promised "every matching record".
 * For La Islita - 10,439 records across six spellings - that renamed 100 and
 * silently abandoned the rest, irreversibly.
 */
const RENAME_PAGE_SIZE = 1000;

/** Safety bound on the re-query loop. See the comment at its use. */
const RENAME_MAX_PASSES = 200;

const AUDIT_CLASSES = ['SurveyData', 'EvaluationMedical', 'Vitals', 'HistoryEnvironmentalHealth'];

export default function CommunityAudit({ orgValues }) {
  const { t } = useTranslation('common');
  const [groups, setGroups] = useState([]);
  const [canonical, setCanonical] = useState({});
  const [applying, setApplying] = useState(null);
  // The group index awaiting confirmation, set when Apply is clicked. Holds the
  // confirm dialog open until the user explicitly confirms the bulk rename.
  const [pendingGroup, setPendingGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  // Some class could not be read. "Nothing found" would then mean "nothing
  // checked", which the dashboard is careful never to say.
  const [partial, setPartial] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // { kind: 'renamed' | 'failed', target } — the outcome of the last rename.
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    if (!orgValues || !orgValues.length) return undefined;
    let ignore = false;
    setLoading(true);
    setPartial(false);
    async function load() {
      // Parse `distinct()` needs the Master Key (client SDK can't use it), so
      // we sample records per class and reduce to distinct community names here.
      // allSettled + settleWithin: one class failing or hanging still lets the
      // others be checked, and the page says which happened (design review C7).
      const results = await Promise.allSettled(
        AUDIT_CLASSES.map(async (cls) => {
          const q = new Parse.Query(cls);
          q.containedIn('surveyingOrganization', orgValues);
          q.select('communityname');
          q.limit(1000);
          const recs = await settleWithin(q.find());
          return recs.map((r) => r.get('communityname'));
        }),
      );
      if (ignore) return;
      const names = [...new Set(results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        .filter(Boolean))];
      setGroups(groupSimilarNames(names));
      setPartial(results.some((r) => r.status === 'rejected'));
      setLoading(false);
    }
    load();
    return () => { ignore = true; };
  }, [orgValues, attempt]);

  async function applyCanonical() {
    if (pendingGroup === null) return;
    const gi = pendingGroup;
    const group = groups[gi];
    const target = canonical[gi] || group[0];
    setApplying(gi);
    setPendingGroup(null);
    setOutcome(null);
    try {
      await Promise.all(AUDIT_CLASSES.map(async (cls) => {
        const variants = group.filter((n) => n !== target);
        await Promise.all(variants.map(async (variant) => {
          // Renamed records drop out of this filter, so the next query returns
          // the ones still unrenamed. That makes re-querying correct and `skip`
          // wrong - skip would step over records that were never touched.
          //
          // The bound is a safety net, not a page count: if a save silently
          // fails the filter never empties, and without it this loops forever.
          for (let pass = 0; pass < RENAME_MAX_PASSES; pass += 1) {
            const q = new Parse.Query(cls);
            q.containedIn('surveyingOrganization', orgValues);
            q.equalTo('communityname', variant);
            // Explicit, because the omission is what caused the bug: Parse
            // applies a server default of 100 when no limit is set, so this
            // renamed 100 records and reported success for all of them.
            q.limit(RENAME_PAGE_SIZE);
            // A failed query throws. Read as "no records left", it ended the
            // loop and the group vanished as though every record were renamed.
            // eslint-disable-next-line no-await-in-loop
            const recs = await q.find();
            if (!recs.length) break;
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(recs.map((r) => {
              r.set('communityname', target);
              return r.save();
            }));
            // A short page means the last one; a full page means there may be
            // more behind it.
            if (recs.length < RENAME_PAGE_SIZE) break;
          }
        }));
      }));
      setGroups((prev) => prev.filter((_, i) => i !== gi));
      setCanonical({});
      setOutcome({ kind: 'renamed', target });
    } catch {
      // The group stays: some records may be renamed and some not, and running
      // it again finishes the job (renamed records no longer match).
      setOutcome({ kind: 'failed', target });
    } finally {
      setApplying(null);
    }
  }

  const pendingTarget = pendingGroup !== null
    ? (canonical[pendingGroup] || groups[pendingGroup][0])
    : '';

  return (
    <Panel title={t('data_curation_audit_title')}>
      <Modal
        open={pendingGroup !== null}
        handleClose={() => setPendingGroup(null)}
        // Interpolated, not concatenated: the community name has to be free to
        // move within the sentence, and the quotation marks around it belong to
        // the locale too.
        text={t('data_curation_audit_rename_confirm', { target: pendingTarget })}
        actionText={t('data_curation_audit_rename_action')}
        intent="primary"
        action={applyCanonical}
      />
      <p className={styles.status} role="status">
        {loading && t('data_curation_audit_loading')}
        {!loading && outcome?.kind === 'renamed' && t('data_curation_audit_renamed', { target: outcome.target })}
      </p>
      {outcome?.kind === 'failed' && (
        <p className={styles.error} role="alert">{t('data_curation_audit_rename_failed', { target: outcome.target })}</p>
      )}
      {!loading && partial && (
        <div className={styles.partial}>
          <p role="alert">{t('data_curation_audit_partial')}</p>
          <Button isSmall text={t('action_try_again')} onClick={() => setAttempt((n) => n + 1)} />
        </div>
      )}
      {!loading && groups.length === 0 && !partial && (
        <p className={styles.empty}>{t('data_curation_audit_empty')}</p>
      )}
      {!loading && groups.length > 0 && (
        <div className={styles.groups}>
          {groups.map((group, gi) => {
            const target = canonical[gi] || group[0];
            return (
              // Index keys: a group has no id, and the list only shrinks.
              // eslint-disable-next-line react/no-array-index-key
              <div key={gi} className={styles.group}>
                <fieldset className={styles.variants}>
                  <legend className={styles.legend}>
                    {t('data_curation_audit_group_legend', { name: group[0] })}
                  </legend>
                  {group.map((name, vi) => (
                    <label
                      key={name}
                      className={styles.variant}
                      htmlFor={`canonical-${gi}-${vi}`}
                    >
                      <input
                        id={`canonical-${gi}-${vi}`}
                        type="radio"
                        name={`canonical-${gi}`}
                        checked={target === name}
                        onChange={() => setCanonical((prev) => ({ ...prev, [gi]: name }))}
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </fieldset>
                <Button
                  text={applying === gi
                    ? t('data_curation_audit_applying')
                    : t('data_curation_audit_apply', { target })}
                  isSmall
                  isDisabled={applying !== null}
                  onClick={() => setPendingGroup(gi)}
                />
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
