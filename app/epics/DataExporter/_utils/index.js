import Button from '@material-ui/core/Button';
import { lighten, makeStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import clsx from 'clsx';
import PropTypes from 'prop-types';

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const EnhancedTableHead = (props) => {
  const {
    classes,
    order,
    orderBy,
    onRequestSort,
    selectedCellLabels,
  } = props;

  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {selectedCellLabels !== undefined && selectedCellLabels.map((headCell) => (
          <TableCell
            key={headCell}
            align="left"
            padding="none"
            sortDirection={orderBy === headCell ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell}
              direction={orderBy === headCell ? order : 'asc'}
              onClick={createSortHandler(headCell)}
            >
              {headCell.length > 10 ? (
                <Tooltip title={headCell} placement="top">
                  <TableCell>
                    {`${headCell.slice(0, 10)}...`}
                  </TableCell>
                </Tooltip>
              ) : (
                headCell
              )}
              {orderBy === headCell ? (
                <span className={classes.visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </span>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

const useToolbarStyles = makeStyles((theme) => ({
  root: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
  },
  highlight:
      theme.palette.type === 'light'
        ? {
          color: theme.palette.secondary.main,
          backgroundColor: lighten(theme.palette.secondary.light, 0.85),
        }
        : {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.secondary.dark,
        },
  title: {
    flex: '1 1 100%',
  },
}));

const EnhancedTableToolbar = (props) => {
  const classes = useToolbarStyles();
  const {
    numSelected, formValue,
    cellLabels,
    setSelectedCellLabels,
    cellLabelMax,
    setCellLabelMax,
  } = props;

  const changeCellLabels = (leftRight) => {
    if (leftRight === 'left') {
      if (cellLabelMax !== 10) {
        setSelectedCellLabels(cellLabels.slice(cellLabelMax - 20, cellLabelMax - 10));
        setCellLabelMax(cellLabelMax - 10);
      }
    } else if (cellLabelMax < cellLabels.length) {
      if (cellLabelMax + 10 > cellLabels.length) {
        setSelectedCellLabels(cellLabels.slice(cellLabelMax, cellLabels.length));
      } else {
        setSelectedCellLabels(cellLabels.slice(cellLabelMax, cellLabelMax + 10));
      }
      setCellLabelMax(cellLabelMax + 10);
    }
  };

  return (
    <Toolbar
      className={clsx(classes.root, {
        [classes.highlight]: numSelected > 0,
      })}
    >
      <Tooltip title="See previous 10 fields in form" placement="top">
        {cellLabelMax === 10 ? (
          <Button
            disabled
          >
            {'<'}
          </Button>
        ) : (
          <Button
            onClick={() => changeCellLabels('left')}
          >
            {'<'}
          </Button>
        )}
      </Tooltip>
      <Tooltip title="See next 10 fields in form" placement="top">
        {cellLabelMax >= cellLabels.length ? (
          <Button
            disabled
          >
            {'>'}
          </Button>
        ) : (
          <Button
            onClick={() => changeCellLabels('right')}
          >
            {'>'}
          </Button>
        )}
      </Tooltip>

      <Typography
        className={classes.title}
        variant="h6"
        id="tableTitle"
        component="div"
        sx={{
          left: 10000,
        }}
      >
        {formValue}
      </Typography>
    </Toolbar>
  );
};

EnhancedTableToolbar.propTypes = {
  numSelected: PropTypes.number.isRequired,
};

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  paper: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  table: {
    minWidth: 750,
  },
  visuallyHidden: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    top: 20,
    width: 1,
  },
}));

export {
  EnhancedTableHead,
  EnhancedTableToolbar, getComparator, stableSort, useStyles,
};
