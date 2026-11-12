import { Button } from 'app/impacto-design-system';
import Icon from 'app/impacto-design-system/icon';
import { settleWithin } from 'app/modules/async/settleWithin';
import { loadOrganizationScope } from 'app/modules/organization';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import PropTypes from 'prop-types';
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import formRecordsQuery from '../../_utils/formRecordsQuery';
import styles from './index.module.scss';

// The forms table's columns: the toggle, name, updated, actions.
const COLUMN_COUNT = 4;

let detailCounter = 0;

function ExpandableTableRowDetail({ row, surveyingOrganization, offersResearch }) {
  const { t } = useTranslation('common');
  // null until a count has loaded. It used to start at 0 and show "0
  // collected" until Refresh was pressed: a false zero, the report this view
  // was fixed for.
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(true);
  // A failed count must not read as "0 collected" either.
  const [countFailed, setCountFailed] = useState(false);

  // The same query the record list runs, so the two never disagree. It used
  // to ask FormResults for every card: Vitals read 0 with 14,799 collected.
  const getCount = useCallback(async () => {
    setCounting(true);
    setCountFailed(false);
    try {
      const scope = await settleWithin(loadOrganizationScope(Parse, surveyingOrganization));
      const query = formRecordsQuery(Parse, row, scope);
      setCount(query ? await settleWithin(query.count()) : 0);
    } catch {
      setCountFailed(true);
    } finally {
      setCounting(false);
    }
  }, [row, surveyingOrganization]);

  useEffect(() => { getCount(); }, [getCount]);

  return (
    <div className={styles.rowDetail}>
      <div className={styles.countLine}>
        {countFailed && <p role="alert">{t('form_manager_records_error')}</p>}
        <p role="status" className={styles.count}>
          {counting && t('form_manager_counting')}
          {!counting && !countFailed && count !== null && t('form_manager_records_collected', { count })}
        </p>
        <Button text={t('action_refresh')} isSmall onClick={getCount} />
      </div>
      {/* Said in the open rather than in a hover tooltip, which keyboard and
          touch users never see. The difference is the whole point. */}
      {offersResearch && (
        <div className={styles.exportNotes}>
          <p>{t('form_manager_research_file_contents')}</p>
          <p>{t('form_manager_full_records_contents')}</p>
        </div>
      )}
    </div>
  );
}

function ExpandableTableRow({
  children, row, name, surveyingOrganization, offersResearch,
}) {
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);
  // React 17 has no useId; one id per row for aria-controls.
  const detailId = useMemo(() => {
    detailCounter += 1;
    return `form-details-${detailCounter}`;
  }, []);

  return (
    <>
      <tr className={styles.expandableRow} role="row">
        <td className={styles.toggleCell} role="cell">
          {/* A disclosure: its name says whose details, aria-expanded says
              whether they're showing (WCAG 4.1.2). */}
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={detailId}
            aria-label={t('form_manager_row_details', { name })}
          >
            <Icon name={isExpanded ? 'arrowDropUp' : 'arrowDropDown'} size="small" />
          </button>
        </td>
        {children}
      </tr>
      {isExpanded && (
        <tr className={styles.detailRow} id={detailId} role="row">
          {/* Spacer under the toggle column. */}
          <td role="cell" className={styles.spacer} />
          <td role="cell" colSpan={COLUMN_COUNT - 1}>
            <ExpandableTableRowDetail
              row={row}
              surveyingOrganization={surveyingOrganization}
              offersResearch={offersResearch}
            />
          </td>
        </tr>
      )}
    </>
  );
}

ExpandableTableRow.propTypes = {
  children: PropTypes.node.isRequired,
  /** The form's display name, for the toggle's accessible name. */
  name: PropTypes.string.isRequired,
  offersResearch: PropTypes.bool,
  row: PropTypes.shape({ objectId: PropTypes.string, name: PropTypes.string }).isRequired,
  surveyingOrganization: PropTypes.string.isRequired,
};

ExpandableTableRow.defaultProps = {
  offersResearch: false,
};

ExpandableTableRowDetail.propTypes = {
  offersResearch: PropTypes.bool.isRequired,
  row: PropTypes.shape({ objectId: PropTypes.string, name: PropTypes.string }).isRequired,
  surveyingOrganization: PropTypes.string.isRequired,
};

export default ExpandableTableRow;
