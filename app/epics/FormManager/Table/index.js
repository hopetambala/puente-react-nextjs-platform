import { Badge, Button, Modal } from 'app/impacto-design-system';
import { updateObject } from 'app/modules/cloud-code';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

import CSVButton from './CSVButton';
import ExpandableTableRow from './ExpandableTableRow';
import styles from './index.module.scss';

const FormManagerTable = ({
  data,
  retrieveCustomData,
  passDataToFormCreator,
  organization,
  shortCode,
  puenteForm,
  onSelectForm,
}) => {
  const { t } = useTranslation('common');
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
        text={t('form_manager_delete_confirm')}
        actionText={t('form_manager_delete_action')}
        intent="danger"
        action={handleRemove}
      />
      {data !== undefined ? (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colCaret} aria-label={t('form_manager_col_expand')} />
              <th>{t('form_manager_col_name')}</th>
              <th>{t('form_manager_col_description')}</th>
              <th className={styles.colStatus}>{t('field_status')}</th>
              <th className={styles.colDate}>{t('form_manager_col_updated')}</th>
              <th className={styles.colActions}>{t('form_manager_col_actions')}</th>
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
                <td><Badge variant="green">{t('form_manager_status_active')}</Badge></td>
                <td className={styles.colDate}>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}</td>
                <td className={styles.colActions}>
                  <div className={styles.actions}>
                    {!puenteForm && (
                      <>
                        <Button
                          text={t('form_manager_edit')}
                          isSmall
                          onClick={() => handleEdit(row)}
                        />
                        <Button
                          text={t('form_manager_duplicate')}
                          isSmall
                          onClick={() => handleDuplicate(row)}
                        />
                        <Button
                          text={t('form_manager_delete')}
                          intent="danger"
                          isSmall
                          onClick={() => handleModal(row)}
                        />
                      </>
                    )}
                    <CSVButton form={row} surveyingOrganization={organization} shortCode={shortCode} />
                  </div>
                </td>
              </ExpandableTableRow>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <p className={styles.empty}>{t('form_manager_empty')}</p>
      )}
    </>
  );
};

export default FormManagerTable;
