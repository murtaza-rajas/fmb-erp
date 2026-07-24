import { Box, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Chip } from '@mui/material';
import PageHeader from '../../../../components/PageHeader';
import EmptyState from '../../../../components/EmptyState';
import ErrorState from '../../../../components/ErrorState';
import { useReorderAlertsQuery } from '../stockLedgerApi';

export default function ReorderAlertsPage() {
  const { data: alerts = [], isLoading, isError, error, refetch } = useReorderAlertsQuery();

  return (
    <Box>
      <PageHeader title="Reorder Alerts" subtitle="Items at or below their reorder level" />
      <Card variant="outlined">
        {isLoading ? (
          <CircularProgress size={20} sx={{ m: 3 }} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : alerts.length === 0 ? (
          <EmptyState title="No items below reorder level" />
        ) : (
          <CardContent sx={{ p: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Current Quantity</TableCell>
                  <TableCell align="right">Reorder Level</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.item._id}>
                    <TableCell>{a.item.name}</TableCell>
                    <TableCell>{a.item.categoryId?.name || '—'}</TableCell>
                    <TableCell align="right">{a.currentQuantity}</TableCell>
                    <TableCell align="right">{a.item.reorderLevel}</TableCell>
                    <TableCell><Chip label="Reorder now" size="small" color="warning" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </Box>
  );
}
