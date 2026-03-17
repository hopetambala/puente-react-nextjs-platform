import { Button, Modal } from 'app/impacto-design-system';
import { updateObject } from 'app/modules/cloud-code';
import { useState } from 'react';

import CSVButton from './CSVButton';
import ExpandableTableRow from './ExpandableTableRow';

const FormManagerTable = ({
  data,
  retrieveCustomData,
  passDataToFormCreator,
  organization,
  puenteForm,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState();

  const handleDuplicate = (object) => {
    passDataToFormCreator('duplicate', object);
  };

  const compareOrganizations = (currentOrgs) => {
    if (currentOrgs[0] === 'Shared') return true;
    return false;
  };

  const handleEdit = (object) => {
    if (
      compareOrganizations(object.organizations)
      || object.class === 'PuenteFormModifications'
    ) {
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
    <>
      <Modal
        open={open}
        handleClose={() => setOpen(!open)}
        text="Do you want to remove this form?"
        actionText="Delete form"
        intent="danger"
        action={handleRemove}
      />
      {data !== undefined ? (
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <ExpandableTableRow
                row={row}
                key={row.name}
                surveyingOrganization={organization}
              >
                <td>{row.name}</td>
                <td>{row.description || '—'}</td>
                <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--spacer-xs)', justifyContent: 'flex-end' }}>
                    {!puenteForm && (
                      <>
                        <Button
                          text="Delete"
                          intent="danger"
                          isSmall
                          onClick={() => handleModal(row)}
                        />
                        <Button
                          text="Duplicate"
                          isSmall
                          onClick={() => handleDuplicate(row)}
                        />
                        <Button
                          text="Edit"
                          isSmall
                          onClick={() => handleEdit(row)}
                        />
                      </>
                    )}
                    <CSVButton form={row} surveyingOrganization={organization} />
                  </div>
                </td>
              </ExpandableTableRow>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'center', padding: 'var(--spacer-l)', color: 'var(--color-text-secondary)' }}>No data available.</p>
      )}
    </>
  );
};

export default FormManagerTable;
