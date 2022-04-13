import {
  Grid,
  Modal,
} from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import AppsIcon from '@material-ui/icons/Apps';
import MenuIcon from '@material-ui/icons/Menu';
import { retrieveCustomData, retrievePuenteFormModifications } from 'app/modules/cloud-code';
import React, { useEffect, useState } from 'react';
import { isArray } from 'underscore';

import GridTable from './Grid';
import styles from './index.module.scss';
import Table from './Table';

const FormManager = ({ context, router, user }) => {
  /* Admin Workflow
  const [organization, setOrganization] = useState('Puente');
  const [organizationList, setOrganizationList] = useState([]);
  */

  const [workflowData, setWorkflowData] = useState({});
  const [puenteData, setPuenteData] = useState([]);
  const [noWorkflowData, setNoWorkflowData] = useState([]);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [listView, setListView] = useState(true);
  const [workflows, setWorkflows] = useState(null);
  const [puenteForms, setPuenteForms] = useState({
    SurveyData: null,
    EnvironmentalHealth: null,
    Vitals: null,
    MedicalEvaluation: null,
  });

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

  const updatePuenteForms = (record) => {
    switch (record.name) {
      case 'SurveyData':
        setPuenteForms((prevForms) => ({ ...prevForms, SurveyData: record }));
        break;
      case 'EnvironmentalHealth':
        setPuenteForms((prevForms) => ({ ...prevForms, EnvironmentalHealth: record }));
        break;
      case 'Vitals':
        setPuenteForms((prevForms) => ({ ...prevForms, Vitals: record }));
        break;
      case 'MedicalEvaluation':
        setPuenteForms((prevForms) => ({ ...prevForms, MedicalEvaluationo: record }));
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    // retrieveCustomData('Shared').then((records) => {
    retrieveCustomData(organization).then((records) => {
      records.forEach((record) => {
        if (isArray(record.workflows)) {
          record.workflows.forEach((workflow) => {
            if (workflow === 'Puente') {
              updatePuenteForms(record);
            }
          });
        }
      });
    }).then(retrievePuenteFormModifications(organization).then((results) => {
      results.forEach((record) => {
        updatePuenteForms(record);
      });
    }, (error) => {
      console.log(error); //eslint-disable-line
    }));
  }, [organization]);

  useEffect(() => {
    let combinedPuenteForms = [];
    Object.entries(puenteForms).forEach(([, value]) => {
      if (value !== null) {
        combinedPuenteForms = combinedPuenteForms === undefined ? [value]
          : combinedPuenteForms.concat([value]);
      }
    });
    setPuenteData(combinedPuenteForms);
  }, [puenteForms]);

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

  const closeWorkflowModal = () => {
    setWorkflowModal(false);
  };

  return (
    <div className={styles.formCreator}>
      <Grid container>
        <h2>Puente Forms</h2>
        {listView === true ? (
          <div>
            <IconButton
              onClick={() => setListView(true)}
              style={{
                backgroundColor: 'lightBlue', color: 'blue', marginTop: 'auto', marginBottom: 'auto',
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
            data={puenteData}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            puenteForm
          />
        ) : (
          <GridTable
            data={puenteData}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            workflows={workflows}
          />
        )}
      </Grid>
      <h2>Custom Forms</h2>
      {/* {workflowModal && ( */}
      <Modal
        open={workflowModal}
        onClose={closeWorkflowModal}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <div style={styles.modalContainer}>
          <h2 id="simple-modal-title">Hi</h2>
          <p id="simple-modal-description">you</p>
        </div>
      </Modal>
      {/* )} */}
      {
        Object.keys(workflowData).map((key) => (
          <Grid>
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
          </Grid>
        ))
      }
      <Grid>
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
      </Grid>
    </div>
  );
};

export default FormManager;
