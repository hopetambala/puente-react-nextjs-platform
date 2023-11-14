import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

const DataExporterTableRow = ({
  row, cellLabels,
}) => (
  <TableRow
    hover
    key={row.objectId}
  >
    {cellLabels.map((label) => (
      <TableCell>
        {typeof (row[label]) !== 'object' && (
        <div>{row[label]}</div>
        )}
      </TableCell>
    ))}
  </TableRow>
);

export default DataExporterTableRow;
