import { Text } from 'app/impacto-design-system';
import { retrieveCustomData } from 'app/modules/cloud-code';
import React, { useEffect, useState } from 'react';
import { isArray } from 'underscore';

import GridTable from './Grid';
import styles from './index.module.scss';
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

const FormManager = ({ context, router, user }) => {
  const [workflowData, setWorkflowData] = useState({});
  const [noWorkflowData, setNoWorkflowData] = useState([]);
  const [listView, setListView] = useState(true);
  const [workflows, setWorkflows] = useState(null);

  const organization = user?.organization || '';

  useEffect(() => {
    refreshWorkflowData();
  }, []);

  const refreshWorkflowData = async () => {
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
      <div className={styles.section}>
        <h2>Puente Forms</h2>
        <div className={styles.tableWrap}>
          <Table
            data={puenteConfig}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            puenteForm
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2>Custom Forms</h2>
        {Object.keys(workflowData).length > 0 ? (
          Object.keys(workflowData).map((key) => (
            <div key={key}>
              <h3>{key}</h3>
              <div className={styles.tableWrap}>
                {listView ? (
                  <Table
                    data={workflowData[key]}
                    retrieveCustomData={retrieveCustomData}
                    passDataToFormCreator={passDataToFormCreator}
                    organization={organization}
                  />
                ) : (
                  <GridTable
                    data={workflowData[key]}
                    retrieveCustomData={retrieveCustomData}
                    passDataToFormCreator={passDataToFormCreator}
                    organization={organization}
                    workflows={workflows}
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>No custom forms yet.</p>
        )}
      </div>

      {noWorkflowData && noWorkflowData.length > 0 && (
        <div className={styles.section}>
          <h2>No Workflow Assigned</h2>
          <div className={styles.tableWrap}>
            <Table
              data={noWorkflowData}
              retrieveCustomData={retrieveCustomData}
              passDataToFormCreator={passDataToFormCreator}
              organization={organization}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FormManager;
