import { EmptyState, Panel, SegmentedControl, Skeleton } from 'app/impacto-design-system';
import { retrieveCustomData } from 'app/modules/cloud-code';
import { useEffect, useMemo, useState } from 'react';
import { isArray } from 'underscore';

import GridTable from './Grid';
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

const VIEW_OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'grid', label: 'Grid' },
];

function FormManager({ context, router, user }) {
  const [workflowData, setWorkflowData] = useState({});
  const [noWorkflowData, setNoWorkflowData] = useState([]);
  const [listView, setListView] = useState('table');
  const [workflows, setWorkflows] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    refreshWorkflowData();
  }, []);

  const refreshWorkflowData = async () => {
    setLoading(true);
    retrieveCustomData(organization).then((records) => {
      const tableDataByCategory = {};
      records.forEach((record) => {
        if (record.active !== 'false') {
          if (!isArray(record.workflows) || record.workflows.length < 1) {
            if ('No Workflow Assigned' in tableDataByCategory) {
              tableDataByCategory['No Workflow Assigned'] = tableDataByCategory[
                'No Workflow Assigned'
              ].concat([record]);
            } else {
              tableDataByCategory['No Workflow Assigned'] = [record];
            }
          } else if (isArray(record.workflows)) {
            record.workflows.forEach((workflow) => {
              if (workflow in tableDataByCategory) {
                tableDataByCategory[workflow] = tableDataByCategory[
                  workflow
                ].concat([record]);
              } else {
                tableDataByCategory[workflow] = [record];
              }
            });
          }
        }
      });
      setNoWorkflowData(tableDataByCategory['No Workflow Assigned']);
      delete tableDataByCategory['No Workflow Assigned'];
      setWorkflows(Object.keys(tableDataByCategory));
      delete tableDataByCategory.Puente;
      setWorkflowData(tableDataByCategory);
      setLoading(false);
    });
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
            <div className="cl-dlite-flex-shrink-0">
              <SegmentedControl options={VIEW_OPTIONS} value={listView} onChange={setListView} />
            </div>
          </div>
          {loading && (
            <div className={styles.section}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--spacer-m)' }}>
                {[55, 70, 40, 60].map((w, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={`${w}%`} height={14} />
                    <Skeleton width={60} height={22} style={{ borderRadius: 6 }} />
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
            <div className={styles.sectionLabel}>Custom Forms</div>
            {Object.keys(filteredWorkflowData).length > 0 ? (
              Object.keys(filteredWorkflowData).map((key) => (
                <Panel key={key} title={key} noPadding>
                  {listView === 'table' ? (
                    <Table
                      data={filteredWorkflowData[key]}
                      retrieveCustomData={retrieveCustomData}
                      passDataToFormCreator={passDataToFormCreator}
                      organization={organization}
                      onSelectForm={setSelectedForm}
                    />
                  ) : (
                    <GridTable
                      data={filteredWorkflowData[key]}
                      retrieveCustomData={retrieveCustomData}
                      passDataToFormCreator={passDataToFormCreator}
                      organization={organization}
                      workflows={workflows}
                    />
                  )}
                </Panel>
              ))
            ) : (
              <EmptyState message="No custom forms yet." />
            )}
          </div>

          {noWorkflowData && noWorkflowData.length > 0 && (
            <div className={styles.section}>
              <Panel title="No Workflow Assigned" noPadding>
                <Table
                  data={noWorkflowData}
                  retrieveCustomData={retrieveCustomData}
                  passDataToFormCreator={passDataToFormCreator}
                  organization={organization}
                  onSelectForm={setSelectedForm}
                />
              </Panel>
            </div>
          )}
          </>
          )}
        </>
      )}
    </div>
  );
}

export default FormManager;
