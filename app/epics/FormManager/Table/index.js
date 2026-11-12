import { Badge, Button, Modal } from 'app/impacto-design-system';
import { updateObject } from 'app/modules/cloud-code';
import offersResearchExport from 'app/modules/data-export/offersResearchExport';
import { formatDate } from 'app/modules/i18n/format';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

import formDisplayName from '../_utils/formDisplayName';
import CSVButton from './CSVButton';
import ExpandableTableRow from './ExpandableTableRow';
import styles from './index.module.scss';

function FormManagerTable({
  data,
  onFormRemoved,
  passDataToFormCreator,
  organization,
  shortCode,
  puenteForm,
  onSelectForm,
}) {
  const { t, i18n } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState();
  // The name of a form whose removal failed. Said, not swallowed.
  const [removeFailed, setRemoveFailed] = useState(null);

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
    setRemoveFailed(null);
    setSelectedForm(row);
    setOpen(true);
  };

  // Waits for the server before telling the page: it used to fire the update,
  // refetch without keeping the answer, and leave the removed form on screen.
  const handleRemove = async () => {
    const form = selectedForm;
    setOpen(false);
    try {
      await updateObject({
        parseClass: 'FormSpecificationsV2',
        parseClassID: form.objectId,
        localObject: { active: 'false' },
      });
      onFormRemoved(form);
    } catch {
      setRemoveFailed(form.name);
    }
  };

  return (
    <>
      {removeFailed && (
        <p className={styles.error} role="alert">{t('form_manager_delete_failed', { name: removeFailed })}</p>
      )}
      <Modal
        open={open}
        handleClose={() => setOpen(false)}
        // Names the form and says what happens to its records (X12).
        text={selectedForm ? t('form_manager_delete_confirm', { name: selectedForm.name }) : ''}
        actionText={t('form_manager_delete_action')}
        intent="danger"
        action={handleRemove}
      />
      {data !== undefined ? (
        // The table's own size container: below 40rem each row becomes a card
        // (index.module.scss). Explicit roles, because display:block on table
        // parts drops their semantics in Safari.
        <div className={styles.tableWrap}>
        <table className={styles.table} role="table">
          <thead>
            <tr role="row">
              <th className={styles.colCaret} role="columnheader" scope="col">
                <span className="sr-only">{t('form_manager_col_expand')}</span>
              </th>
              <th role="columnheader" scope="col">{t('form_manager_col_name')}</th>
              <th className={styles.colDate} role="columnheader" scope="col">{t('form_manager_col_updated')}</th>
              <th className={styles.colActions} role="columnheader" scope="col">{t('form_manager_col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const offersResearch = offersResearchExport(row, shortCode);
              return (
              <ExpandableTableRow
                row={row}
                key={row.objectId || row.name}
                name={formDisplayName(row, t)}
                surveyingOrganization={organization}
                offersResearch={offersResearch}
              >
                <td className={styles.nameCell} role="cell" data-label={t('form_manager_col_name')}>
                  {onSelectForm ? (
                    <button
                      type="button"
                      className={styles.nameLink}
                      onClick={() => onSelectForm(row)}
                    >
                      {formDisplayName(row, t)}
                    </button>
                  ) : (
                    formDisplayName(row, t)
                  )}
                  {/* The description sits under the name at every width: as
                      its own column it was hidden below 1440px, and truncated
                      behind a hover-only title above it. */}
                  {row.description && <span className={styles.description}>{row.description}</span>}
                  {/* Under the name, not in its own column: the name column
                      wraps, and a long Spanish badge widened the whole table. */}
                  {offersResearch && (
                    <span className={styles.nameBadge}>
                      <Badge variant="blue">{t('form_manager_research_badge')}</Badge>
                    </span>
                  )}
                </td>
                <td className={styles.colDate} role="cell" data-label={t('form_manager_col_updated')}>
                  {formatDate(row.updatedAt, i18n?.language)}
                </td>
                <td className={styles.colActions} role="cell" data-label={t('form_manager_col_actions')}>
                  {/* A research-enabled row carries two export buttons; stacking the
                      groups keeps them on screen instead of past the table edge. */}
                  <div className={offersResearch
                    ? `${styles.actions} ${styles.actionsStacked}` : styles.actions}
                  >
                    {!puenteForm && (
                      <span className={styles.actionGroup}>
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
                      </span>
                    )}
                    <span className={styles.actionGroup}>
                      <CSVButton form={row} surveyingOrganization={organization} shortCode={shortCode} />
                    </span>
                  </div>
                </td>
              </ExpandableTableRow>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : (
        <p className={styles.empty}>{t('form_manager_empty')}</p>
      )}
    </>
  );
}

export default FormManagerTable;
