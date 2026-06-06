import { Badge, Button, Modal } from 'app/impacto-design-system';
import { updateObject } from 'app/modules/cloud-code';
import { useState } from 'react';

import CSVButton from './CSVButton';
import ExpandableTableRow from './ExpandableTableRow';
import styles from './index.module.scss';

const FormManagerTable = ({
  data,
  retrieveCustomData,
  passDataToFormCreator,
  organization,
  puenteForm,
  onSelectForm,
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
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colCaret} aria-label="Expand" />
              <th>Name</th>
              <th>Description</th>
              <th className={styles.colStatus}>Status</th>
              <th className={styles.colDate}>Updated</th>
              <th className={styles.colActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <ExpandableTableRow
                row={row}
                key={row.name}
                surveyingOrganization={organization}
              >
                <td className={styles.nameCell}>
                  {onSelectForm ? (
                    <button
                      type="button"
                      className={styles.nameLink}
                      onClick={() => onSelectForm(row)}
                    >
                      {row.name}
                    </button>
                  ) : (
                    row.name
                  )}
                </td>
                <td>
                  <div className={styles.descCell} title={row.description || ''}>
                    {row.description || '—'}
                  </div>
                </td>
                <td><Badge variant="green">Active</Badge></td>
                <td className={styles.colDate}>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}</td>
                <td className={styles.colActions}>
                  <div className={styles.actions}>
                    {!puenteForm && (
                      <>
                        <Button
                          text="Edit"
                          isSmall
                          onClick={() => handleEdit(row)}
                        />
                        <Button
                          text="Duplicate"
                          isSmall
                          onClick={() => handleDuplicate(row)}
                        />
                        <Button
                          text="Delete"
                          intent="danger"
                          isSmall
                          onClick={() => handleModal(row)}
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
        </div>
      ) : (
        <p className={styles.empty}>No data available.</p>
      )}
    </>
  );
};

export default FormManagerTable;
