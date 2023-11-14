import IconButton from '@material-ui/core/IconButton';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
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
        <Text text={`Count Number of forms collected: ${count}`} element="h3" />
        <Button text="Refresh" onClick={getCount} />
      </Stack>
    </div>
  );
};

const ExpandableTableRow = ({
  children, expandComponent, row, surveyingOrganization, ...otherProps
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow {...otherProps}>
        <TableCell padding="checkbox">
          <IconButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        {children}
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell padding="checkbox" />
          <ExpandableTableRowDetail row={row} surveyingOrganization={surveyingOrganization} />
        </TableRow>
      )}
    </>
  );
};

export default ExpandableTableRow;
