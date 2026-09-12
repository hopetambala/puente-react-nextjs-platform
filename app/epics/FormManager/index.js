import { Button, EmptyState, Panel, Skeleton } from 'app/impacto-design-system';
import { retrieveCustomData } from 'app/modules/cloud-code';
import { loadOrganizationIdentity } from 'app/modules/organization';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useEffect, useMemo, useState } from 'react';
import { isArray } from 'underscore';

import styles from './index.module.scss';
import RecordsTable from './RecordsTable';
import Table from './Table';

const puenteConfig = [
  {
    name: 'SurveyData',
    description: '',
  },
  {
    name: 'HistoryEnvironmentalHealth',
    description: '',
  },
  {
    name: 'Vitals',
    description: '',
  },
  {
    name: 'EvaluationMedical',
    description: '',
  },
];

function FormManager({ context, router, user }) {
  const { t } = useTranslation('common');

  // The organization every fetch on this screen is scoped to. Empty string
  // until the auth layer resolves one, which is what the fetch guards test.
  const organization = user?.organization || '';

  const [workflowData, setWorkflowData] = useState({});
  const [noWorkflowData, setNoWorkflowData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Starts true whenever there is an organization to fetch for, so the very
  // first paint of the custom-forms area is the skeleton and never
  // "no custom forms yet" — that empty state is only truthful once the request
  // has come back empty. With no organization there is no fetch, so it starts
  // false and the content paints straight away.
  const [loading, setLoading] = useState(Boolean(organization));
  const [selectedForm, setSelectedForm] = useState(null);
  // A failed custom-forms request is not an empty organization: without this the
  // coordinator is told "no custom forms yet" and believes their forms are gone.
  const [customFormsError, setCustomFormsError] = useState(false);
  // A RETRY is not a first load, and must not raise `loading`. Doing so unmounted
  // this whole region — including the button the user had just pressed — so focus
  // fell to <body> and their next Tab restarted at the top of the page, seconds
  // later, on the slow connection that caused the failure. Measured, not guessed.
  const [isRetrying, setIsRetrying] = useState(false);

  // The CSV exporter keys on shortCode so an export covers every string the
  // organization's records carry. Null until resolved, and null for an
  // organization we do not recognise — CSVButton falls back to the legacy
  // single-name path in both cases rather than exporting nothing.
  const [shortCode, setShortCode] = useState(null);
  useEffect(() => {
    if (!organization) return undefined;
    let ignore = false;
    loadOrganizationIdentity(Parse, organization).then((identity) => {
      if (!ignore) setShortCode(identity.shortCode);
    });
    return () => { ignore = true; };
  }, [organization]);

  const filteredWorkflowData = useMemo(() => {
    if (!searchTerm.trim()) return workflowData;
    const term = searchTerm.toLowerCase();
    return Object.fromEntries(
      Object.entries(workflowData)
        .map(([wf, forms]) => [wf, forms.filter((f) => f.name.toLowerCase().includes(term))])
        .filter(([, forms]) => forms.length > 0),
    );
  }, [workflowData, searchTerm]);

  // Custom forms with no workflow assigned are still custom forms — they belong
  // in the Custom Forms section, not a separate orphan panel. Same search filter.
  const filteredNoWorkflowData = useMemo(() => {
    const list = noWorkflowData || [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(term));
  }, [noWorkflowData, searchTerm]);

  // This section has three mutually exclusive states — failed, has forms, empty.
  // Naming the middle one keeps them three flat conditions in the JSX instead of
  // a ternary nested inside a guard, which is what they were.
  const hasCustomForms = Object.keys(filteredWorkflowData).length > 0
    || filteredNoWorkflowData.length > 0;

  const appendToCategory = (map, key, record) => {
    // eslint-disable-next-line no-param-reassign
    map[key] = key in map ? map[key].concat([record]) : [record];
  };

  const refreshWorkflowData = async ({ isRetry = false } = {}) => {
    if (isRetry) setIsRetrying(true);
    else setLoading(true);
    try {
      const records = await retrieveCustomData(organization);
      const tableDataByCategory = {};
      records.forEach((record) => {
        if (record.active !== 'false') {
          if (!isArray(record.workflows) || record.workflows.length < 1) {
            appendToCategory(tableDataByCategory, 'No Workflow Assigned', record);
          } else if (isArray(record.workflows)) {
            record.workflows.forEach((workflow) => {
              appendToCategory(tableDataByCategory, workflow, record);
            });
          }
        }
      });
      setNoWorkflowData(tableDataByCategory['No Workflow Assigned']);
      delete tableDataByCategory['No Workflow Assigned'];
      delete tableDataByCategory.Puente;
      setWorkflowData(tableDataByCategory);
      setCustomFormsError(false);
    } catch {
      // network / parse error — say so, rather than reporting it as an empty org
      setCustomFormsError(true);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  // Named, not an inline arrow: react/jsx-no-bind is on in this repo.
  const handleRetry = () => refreshWorkflowData({ isRetry: true });

  useEffect(() => {
    if (!organization) return;
    refreshWorkflowData();
  }, [organization]);

  const passDataToFormCreator = (action, data) => {
    const href = '/forms/form-creator';

    const storedData = {
      action,
      data,
    };

    context.addPropToStore(href, storedData); // contextManagement.removeFromGlobalStoreData(key);
    router.push(href);
  };

  return (
    <div className={styles.formManager}>
      {/* ── Drill-in view: records for a selected form ── */}
      {selectedForm ? (
        <div>
          <div className={styles.filterStrip}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setSelectedForm(null)}
              aria-label={t('form_manager_back_aria')}
            >
              {t('form_manager_back')}
            </button>
          </div>
          <RecordsTable form={selectedForm} />
        </div>
      ) : (
        <>
          {/* ── Catalog view ── */}
          <div className={styles.filterStrip}>
            <div className={styles.filterLeft}>
              <button
                type="button"
                className={styles.createFormBtn}
                onClick={() => router.push('/forms/form-creator')}
              >
                {t('form_manager_create')}
              </button>
              <div className={styles.search}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  type="text"
                  placeholder={t('form_manager_search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          </div>
          {loading && (
            <div className={styles.section}>
              <div className={styles.skeletonList}>
                {[55, 70, 40, 60].map((w, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className={styles.skeletonRow}>
                    <Skeleton width={`${w}%`} height={14} />
                    <Skeleton width={60} height={22} style={{ borderRadius: 'var(--tk-dlite-semantic-border-radius-sm)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {!loading && (
          <>
          <div className={styles.section}>
            <Panel title={t('form_manager_puente_forms')} noPadding>
              <Table
                data={puenteConfig}
                retrieveCustomData={retrieveCustomData}
                passDataToFormCreator={passDataToFormCreator}
                organization={organization}
                shortCode={shortCode}
                onSelectForm={setSelectedForm}
                puenteForm
              />
            </Panel>
          </div>

          <div className={styles.section}>
            {customFormsError && (
              // role="alert" because the swap happens after an async failure with
              // no other cue: a screen-reader user watching the skeleton go away
              // otherwise gets silence.
              <div role="alert" className="cl-dlite-text-center cl-dlite-sem-py-xxl cl-dlite-sem-px-lg">
                <p className={styles.errorStateTitle}>{t('form_manager_custom_forms_error')}</p>
                <p className={styles.errorStateSub}>{t('form_manager_custom_forms_error_sub')}</p>
                <div className="cl-dlite-sem-mt-md">
                  <Button
                    text={t('form_manager_retry')}
                    onClick={handleRetry}
                    intent="primary"
                    isSmall
                    isLoading={isRetrying}
                  />
                </div>
              </div>
            )}
            {!customFormsError && hasCustomForms && (
              <>
                {Object.keys(filteredWorkflowData).map((key) => (
                  <Panel key={key} title={key} noPadding>
                    <Table
                      data={filteredWorkflowData[key]}
                      retrieveCustomData={retrieveCustomData}
                      passDataToFormCreator={passDataToFormCreator}
                      organization={organization}
                      shortCode={shortCode}
                      onSelectForm={setSelectedForm}
                    />
                  </Panel>
                ))}
                {filteredNoWorkflowData.length > 0 && (
                  <Panel
                    title={Object.keys(filteredWorkflowData).length > 0
                      ? t('form_manager_other_forms')
                      : t('form_manager_custom_forms')}
                    noPadding
                  >
                    <Table
                      data={filteredNoWorkflowData}
                      retrieveCustomData={retrieveCustomData}
                      passDataToFormCreator={passDataToFormCreator}
                      organization={organization}
                      shortCode={shortCode}
                      onSelectForm={setSelectedForm}
                    />
                  </Panel>
                )}
              </>
            )}
            {!customFormsError && !hasCustomForms && (
              <EmptyState message={t('form_manager_no_custom_forms')} />
            )}
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
}

export default FormManager;
