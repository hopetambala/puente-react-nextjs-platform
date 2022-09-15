import { Table } from 'app/components/design-system/organisms';
import React, { useEffect, useState } from 'react';

import retrieveAllFormResults from './_data';
import FormMenu from './FormMenu';
import SubmitButton from './SubmitButton';

const DataExporter = ({ user }) => {
  // const [order, setOrder] = useState('asc');
  // const [orderBy, setOrderBy] = useState('surveyingOrganization');
  // const [selected, setSelected] = useState([]);
  // const [page, setPage] = useState(0);
  // const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [cellLabels, setCellLabels] = useState([]);
  const [formType, setFormType] = useState('SurveyData');
  const [formValue, setFormValue] = useState('Survey Data');
  const [params, setParams] = useState({
    surveyingOrganization: user.organization,
  });
  const [selectedCellLabels, setSelectedCellLabels] = useState([]);
  const [cellLabelMax, setCellLabelMax] = useState(10);
  const [csvData, setCsvData] = useState([]);

  const { organization } = user;

  const refreshDataExporter = () => {
    retrieveAllFormResults(formType, params).then((records) => {
      setCellLabelMax(10);
      if (records.length < 1 || records === undefined) {
        setCellLabels([]);
        setSelectedCellLabels([]);
        setRows([]);
      } else {
        setCellLabels(Object.keys(records[0]));
        setSelectedCellLabels(Object.keys(records[0]).slice(0, cellLabelMax));
        setRows(records);
      }
    });
  };

  useEffect(() => {
    refreshDataExporter();
  }, []);

  const handleSubmit = () => {
    refreshDataExporter();
  };

  return (
    <div>
      <FormMenu
        setFormType={setFormType}
        formType={formType}
        setFormValue={setFormValue}
        formValue={formValue}
        setParams={setParams}
        organization={organization}
        setCsvData={setCsvData}
      />
      <SubmitButton
        handleSubmit={handleSubmit}
        surveyingOrganization={organization}
        specifier={formType}
        customFormId={params.formSpecificationsId}
        csvData={csvData}
        setCsvData={setCsvData}
      />
      <Table />
    </div>
  );
};

export default DataExporter;
