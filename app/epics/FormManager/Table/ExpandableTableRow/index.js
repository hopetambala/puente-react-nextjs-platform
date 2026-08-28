import { Button, Stack, Text } from 'app/impacto-design-system';
import { customMultiParamCountService } from 'app/modules/cloud-code';
import { useState } from 'react';

import styles from './index.module.scss';

const ExpandableTableRowDetail = ({ row, surveyingOrganization }) => {
  const [count, setCount] = useState(0);

  const { objectId } = row;

  const getCount = async () => {
    const asynCount = await customMultiParamCountService('FormResults', {
      formSpecificationsId: objectId,
      surveyingOrganization,
    });

    setCount(asynCount);
  };

  return (
    <div className={styles.rowDetail}>
      <Stack spacing="extraLarge" isWrapDisabled>
        <Text text={`Forms collected: ${count}`} element="h3" />
        <Button text="Refresh" isSmall onClick={getCount} />
      </Stack>
    </div>
  );
};

const ExpandableTableRow = ({
  children, row, surveyingOrganization,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className={styles.expandableRow}>
        <td style={{ width: 40 }}>
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </td>
        {children}
      </tr>
      {isExpanded && (
        <tr className={styles.detailRow}>
          {/* Spacer cell aligning under the expand-toggle column -- it is empty
              by design, so there is no label to associate. */}
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <td />
          {/* The detail panel supplies its own heading and button labels, which
              the rule cannot see across the component boundary. */}
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <td colSpan={5}>
            <ExpandableTableRowDetail row={row} surveyingOrganization={surveyingOrganization} />
          </td>
        </tr>
      )}
    </>
  );
};

export default ExpandableTableRow;
