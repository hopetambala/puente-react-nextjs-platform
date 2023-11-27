import FormControlLabel from '@material-ui/core/FormControlLabel';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import TablePagination from '@material-ui/core/TablePagination';
import React, { useEffect, useState } from 'react';

import retrieveAllFormResults from './_data';
import {
  EnhancedTableHead, EnhancedTableToolbar, getComparator, stableSort, useStyles,
} from './_utils';
import DataExporterTableRow from './DataExporterTableRow';
import FormMenu from './FormMenu';
import SubmitButton from './SubmitButton';

const DataExporter = ({ user }) => {
  const classes = useStyles();
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('surveyingOrganization');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [cellLabels, setCellLabels] = useState([]);
  const [formType, setFormType] = useState('SurveyData');
  const [formValue, setFormValue] = useState('Survey Data');
  const [params, setParams] = useState({ surveyingOrganization: user.organization });
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

  const handleClick = (event, name) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n) => n.fname);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeDense = (event) => {
    setDense(event.target.checked);
  };

  return (
    <div className={classes.root}>
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
      <Paper className={classes.paper}>
        <EnhancedTableToolbar
          numSelected={selected.length}
          formValue={formValue}
          cellLabels={cellLabels}
          selectedCellLabels={selectedCellLabels}
          setSelectedCellLabels={setSelectedCellLabels}
          cellLabelMax={cellLabelMax}
          setCellLabelMax={setCellLabelMax}
        />
        <TableContainer>
          <Table
            className={classes.table}
            aria-labelledby="tableTitle"
            size={dense ? 'small' : 'medium'}
            aria-label="enhanced table"
          >
            <EnhancedTableHead
              classes={classes}
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={rows.length}
              cellLabels={cellLabels}
              selectedCellLabels={selectedCellLabels}
            />
            <TableBody>
              {stableSort(rows, getComparator(order, orderBy))
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <DataExporterTableRow
                    row={row}
                    index={index}
                    cellLabels={selectedCellLabels}
                    handleClick={handleClick}
                    selected={selected}
                  />

                ))}
              {rows.length === 0 && (
                <h5>
                  You have no data for
                  {formValue}
                  {' '}
                  form in the
                  {organization}
                  {' '}
                  organization. If you believe this is an error,
                  please contact your point of contact.
                </h5>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <FormControlLabel
        control={<Switch checked={dense} onChange={handleChangeDense} />}
        label="Dense padding"
      />
    </div>
  );
};

export default DataExporter;
