import IconButton from '@material-ui/core/IconButton';
import AppsIcon from '@material-ui/icons/Apps';
import MenuIcon from '@material-ui/icons/Menu';
import { Stack, Text } from 'app/components/elements';
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
  /* Admin Workflow
  const [organization, setOrganization] = useState('Puente');
  const [organizationList, setOrganizationList] = useState([]);
  */

  const [workflowData, setWorkflowData] = useState({});
  const [noWorkflowData, setNoWorkflowData] = useState([]);
  const [listView, setListView] = useState(true);
  const [workflows, setWorkflows] = useState(null);

  const organization = user?.organization || ''; // testing

  useEffect(() => {
    retrieveCustomData(organization).then((records) => {
      const tableDataByCategory = {};
      records.forEach((record) => {
        if (record.active !== 'false') {
          if (!isArray(record.workflows) || record.workflows.length < 1) {
            if ('No Workflow Assigned' in tableDataByCategory) {
              tableDataByCategory['No Workflow Assigned'] = tableDataByCategory['No Workflow Assigned'].concat([record]);
            } else {
              tableDataByCategory['No Workflow Assigned'] = [record];
            }
          } else if (isArray(record.workflows)) {
            record.workflows.forEach((workflow) => {
              if (workflow in tableDataByCategory) {
                tableDataByCategory[workflow] = tableDataByCategory[workflow].concat([record]);
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

    /**
     * ADMIN WORKFLOW
     */
    // retrieveUniqueListOfOrganizations().then((results) => {
    //   setOrganizationList(results);
    // });
    // setOrganizationList([organization]);
  }, [organization]);

  /**
   * ADMIN WORKFLOW
   * @param {*} action
   * @param {*} data
   */
  // const handleOrganization = (event) => {
  //   setOrganization(event.target.value);
  // };

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
    <div className={styles.formCreator}>
      <Stack isVertical spacing="medium">
        <Text element="h2" text="Puente Forms" />
        {listView === true ? (
          <div>
            <IconButton
              onClick={() => setListView(true)}
              style={{
                backgroundColor: 'lightBlue',
                color: 'blue',
                marginTop: 'auto',
                marginBottom: 'auto',
              }}
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              onClick={() => setListView(false)}
              style={{ color: 'grey' }}
            >
              <AppsIcon />
            </IconButton>
          </div>
        ) : (
          <div>
            <IconButton
              onClick={() => setListView(true)}
              style={{ color: 'grey' }}
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              onClick={() => setListView(false)}
              style={{ backgroundColor: 'lightBlue', color: 'blue' }}
            >
              <AppsIcon />
            </IconButton>
          </div>
        )}
        {/**
         * ADMIN WORKFLOW
         */}
        {/* <Grid item xs={12}>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={organization}
            onChange={handleOrganization}
          >
            {organizationList.length < 1
                  && <CircularProgress />}
            {organization.length > 1
            && organizationList.map((value) => <MenuItem value={value}>{value}</MenuItem>)}
          </Select>
        </Grid> */}
        {listView === true ? (
          <Table
            data={puenteConfig}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            puenteForm
          />
        ) : (
          <GridTable
            data={puenteConfig}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            workflows={workflows}
          />
        )}
      </Stack>
      <Stack isVertical spacing="medium">
        <Text element="h2" text="Custom Forms" />

        {Object.keys(workflowData).map((key) => (
          <div isVertical spacing="medium">
            <h3>{key}</h3>
            {listView === true ? (
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
        ))}
      </Stack>

      <Stack isVertical spacing="medium">
        <h3>No Workflow Assigned</h3>
        {listView === true ? (
          <Table
            data={noWorkflowData}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
          />
        ) : (
          <GridTable
            data={noWorkflowData}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            workflows={workflows}
          />
        )}
      </Stack>
    </div>
  );
};

export default FormManager;
