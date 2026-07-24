import { Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Box } from '@mui/material';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';

export default function ReportTable({ columns, rows, isLoading, isError, error, onRetry, emptyMessage = 'No data for the selected filters' }) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError) return <ErrorState error={error} onRetry={onRetry} />;

  if (!rows || rows.length === 0) return <EmptyState title={emptyMessage} />;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align || 'left'}>
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row._id || row.id || idx}>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align || 'left'}>
                    {col.cell ? col.cell(row) : (row[col.key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
