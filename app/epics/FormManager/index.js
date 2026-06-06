import { EmptyState, Panel, Skeleton } from 'app/impacto-design-system';
import { retrieveCustomData } from 'app/modules/cloud-code';
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
  const [workflowData, setWorkflowData] = useState({});
  const [noWorkflowData, setNoWorkflowData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);

  const organization = user?.organization || '';

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

  useEffect(() => {
    if (!organization) return;
    refreshWorkflowData();
  }, [organization]);

  const appendToCategory = (map, key, record) => {
    // eslint-disable-next-line no-param-reassign
    map[key] = key in map ? map[key].concat([record]) : [record];
  };

  const refreshWorkflowData = async () => {
    setLoading(true);
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
    } catch {
      // network / parse error — loading flag is cleared in finally; content remains visible
    } finally {
      setLoading(false);
    }
  };

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
              aria-label="Back to form catalog"
            >
              ← Back
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
                + Create form
              </button>
              <div className={styles.search}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  type="text"
                  placeholder="Search forms…"
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
            <Panel title="Puente Forms" noPadding>
              <Table
                data={puenteConfig}
                retrieveCustomData={retrieveCustomData}
                passDataToFormCreator={passDataToFormCreator}
                organization={organization}
                onSelectForm={setSelectedForm}
                puenteForm
              />
            </Panel>
          </div>

          <div className={styles.section}>
            {(Object.keys(filteredWorkflowData).length > 0 || filteredNoWorkflowData.length > 0) ? (
              <>
                {Object.keys(filteredWorkflowData).map((key) => (
                  <Panel key={key} title={key} noPadding>
                    <Table
                      data={filteredWorkflowData[key]}
                      retrieveCustomData={retrieveCustomData}
                      passDataToFormCreator={passDataToFormCreator}
                      organization={organization}
                      onSelectForm={setSelectedForm}
                    />
                  </Panel>
                ))}
                {filteredNoWorkflowData.length > 0 && (
                  <Panel
                    title={Object.keys(filteredWorkflowData).length > 0 ? 'Other forms' : 'Custom forms'}
                    noPadding
                  >
                    <Table
                      data={filteredNoWorkflowData}
                      retrieveCustomData={retrieveCustomData}
                      passDataToFormCreator={passDataToFormCreator}
                      organization={organization}
                      onSelectForm={setSelectedForm}
                    />
                  </Panel>
                )}
              </>
            ) : (
              <EmptyState message="No custom forms yet." />
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
