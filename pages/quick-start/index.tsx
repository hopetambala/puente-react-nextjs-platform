import { AppShell, Badge, PageHeader } from 'app/impacto-design-system';
import { retrieveCurrentUserAsyncFunction } from 'app/modules/user';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Parse } from 'parse';
import { useEffect, useState } from 'react';

import styles from './index.module.scss';

const FORM_DOT_COLORS = [
  'var(--tk-dlite-primitive-color-blue-500)',
  'var(--tk-dlite-primitive-color-green-500)',
  'var(--tk-dlite-primitive-color-yellow-500)',
  'var(--tk-dlite-primitive-color-purple-500)',
  'var(--tk-dlite-primitive-color-orange-500)',
];

const SPARKBAR_HEIGHTS = [20, 35, 15, 50, 30, 45, 100];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Dashboard() {
  const { t } = useTranslation('common');

  const [firstName, setFirstName] = useState('');
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityItems, setActivityItems] = useState<{ time: string; text: string }[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [forms, setForms] = useState<{ name: string; count: number; active: boolean }[]>([]);
  const [recordsToday, setRecordsToday] = useState<number | null>(null);

  useEffect(() => {
    const user = retrieveCurrentUserAsyncFunction();
    if (user) {
      setFirstName(user.get('firstName') || user.get('username') || '');
    }
  }, []);

  useEffect(() => {
    async function fetchRecordsToday() {
      try {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const query = new Parse.Query('SurveyData');
        query.greaterThanOrEqualTo('createdAt', midnight);
        const n = await query.count();
        setRecordsToday(n);
      } catch {
        setRecordsToday(0);
      }
    }
    fetchRecordsToday();
  }, []);

  useEffect(() => {
    // TODO: wire to statsService.aggregateStats when endpoint is available
    async function fetchActivity() {
      try {
        const SurveyData = Parse.Object.extend('SurveyData');
        const query = new Parse.Query(SurveyData);
        query.descending('createdAt');
        query.limit(10);
        const results = await query.find();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = results.map((r: any) => ({
          time: formatTime(r.createdAt),
          text: `${r.get('surveyingUser') || 'Someone'} submitted a record`,
        }));
        setActivityItems(items);
      } catch {
        setActivityItems([]);
      } finally {
        setActivityLoading(false);
      }
    }
    fetchActivity();
  }, []);

  useEffect(() => {
    // TODO: wire to statsService.aggregateStats when endpoint is available
    async function fetchForms() {
      try {
        const query = new Parse.Query('FormSpecificationsV2');
        query.equalTo('active', 'true');
        query.descending('updatedAt');
        query.limit(8);
        const results = await query.find();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = results.map((r: any) => ({
          name: r.get('name') || 'Untitled form',
          count: 0,
          active: r.get('active') === 'true',
        }));
        setForms(items);
      } catch {
        setForms([]);
      } finally {
        setFormsLoading(false);
      }
    }
    fetchForms();
  }, []);

  const today = formatDate(new Date());

  return (
    <AppShell
      breadcrumb={['Dashboard']}
    >
      <div className={styles.dashboard}>
        <PageHeader
          eyebrow={today}
          title={firstName ? t('dashboard_good_morning', { name: firstName }) : t('dashboard_good_morning', { name: '…' })}
          sub={t('dashboard_sub')}
        />

        {/* stat strip */}
        <div className={styles.statStrip}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('stat_records_today')}</span>
            <span className={styles.statValue}>
              {recordsToday === null ? '–' : recordsToday}
            </span>
            <div className={styles.sparkline}>
              {/* eslint-disable react/no-array-index-key */}
              {SPARKBAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`${styles.bar}${i === SPARKBAR_HEIGHTS.length - 1 ? ` ${styles.barActive}` : ''}`}
                  style={{ height: `${h}%` }}
                />
              ))}
              {/* eslint-enable react/no-array-index-key */}
            </div>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('stat_active_surveyors')}</span>
            <span className={styles.statValue}>–</span>
            <div className={styles.statMeta}>
              <span className={styles.pulse} />
              <span>No live data</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('stat_households')}</span>
            <span className={styles.statValue}>–</span>
            <div className={styles.statMeta}>of – in territory</div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} />
            </div>
          </div>
        </div>

        {/* two-column body */}
        <div className={styles.body}>
          {/* field activity feed */}
          <div>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>{t('field_activity')}</span>
            </div>
            {activityLoading && (
              <div className={styles.spinnerWrap}>
                <span className={styles.statLabel}>Loading…</span>
              </div>
            )}
            {!activityLoading && activityItems.length === 0 && (
              <div className={styles.activityEmpty}>No recent submissions.</div>
            )}
            {!activityLoading && activityItems.length > 0 && (
              <div className={styles.activityList}>
                {activityItems.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className={styles.activityRow}>
                    <span className={styles.activityTime}>{item.time}</span>
                    <span className={styles.activityDot} />
                    <span className={styles.activityText}>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* your forms */}
          <div>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>{t('your_forms')}</span>
            {/* eslint-disable jsx-a11y/anchor-is-valid */}
            <Link href="/forms/form-manager" passHref>
              <a className={styles.panelLink}>View all →</a>
            </Link>
            {/* eslint-enable jsx-a11y/anchor-is-valid */}
            </div>
            {formsLoading && (
              <div className={styles.spinnerWrap}>
                <span className={styles.statLabel}>Loading…</span>
              </div>
            )}
            {!formsLoading && forms.length === 0 && (
              <div className={styles.activityEmpty}>No forms yet.</div>
            )}
            {!formsLoading && forms.length > 0 && (
              <div className={styles.formList}>
                {forms.map((form, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className={styles.formRow}>
                    <span
                      className={styles.formDot}
                      style={{ background: FORM_DOT_COLORS[i % FORM_DOT_COLORS.length] }}
                    />
                    <span className={styles.formName}>{form.name}</span>
                    <span className={styles.formCount}>{form.count}</span>
                    {form.active && <Badge variant="yellow">Field-active</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
