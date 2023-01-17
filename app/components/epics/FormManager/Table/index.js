import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from 'app/components/elements/button';
import { Modal } from 'app/components/molecules';
import { updateObject } from 'app/modules/cloud-code';
import React, { useState } from 'react';

import CSVButton from './CSVButton';
import ExpandableTableRow from './ExpandableTableRow';

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

const FormManagerTable = ({
  data,
  retrieveCustomData, passDataToFormCreator,
  organization,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState();
  const classes = useStyles();

  const handleDuplicate = (object) => {
    passDataToFormCreator('duplicate', object);
  };

  const compareOrganizations = (currentOrgs) => {
    if (currentOrgs[0] === 'Shared') return true;
    return false;
  };

  const handleEdit = (object) => {
    if (compareOrganizations(object.organizations) || object.class === 'PuenteFormModifications') {
      object.organizations = [organization]; //eslint-disable-line
      passDataToFormCreator('edit puente form', object);
    } else {
      passDataToFormCreator('edit', object);
    }
  };

  const handleModal = (row) => {
    setOpen(!open);
    setSelectedForm(row);
  };
  const handleRemove = () => {
    const params = {
      parseClass: 'FormSpecificationsV2',
      parseClassID: selectedForm.objectId,
      localObject: {
        active: 'false',
      },
    };

    updateObject(params);
    retrieveCustomData(organization);
    setOpen(!open);
  };

  return (
    <TableContainer component={Paper}>
      <Modal
        open={open}
        handleClose={() => setOpen(!open)}
        text="Do you want to remove this Form"
        action={handleRemove}
        actionText="Remove"
      />
      { data !== undefined ? (
        <Table className={classes.table} aria-label="simple table">
          <TableHead>
            <TableRow>
              {/* {data && headings.map((heading,index)=>(
              <TableCell key={index}>{heading}</TableCell>
            ))} */}
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Creation Date</TableCell>
              <TableCell>Updated Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row) => (
              <ExpandableTableRow
                row={row}
                key={row.name}
                expandComponent={<TableCell colSpan="5" />}
              >
                <TableCell>
                  {row.name}
                </TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.createdAt}</TableCell>
                <TableCell>{row.updatedAt}</TableCell>
                <TableCell>
                  <Button aria-label="remove" text="Delete Form" onClick={() => handleModal(row)} />
                  <Button aria-label="duplicate" text="Duplicate Form" onClick={() => handleDuplicate(row)} />
                  <Button aria-label="edit" text="Edit Form" onClick={() => handleEdit(row)} />
                  <CSVButton form={row} />
                </TableCell>
              </ExpandableTableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <h3>No Data Available</h3>
      )}
    </TableContainer>
  );
};

export default FormManagerTable;
