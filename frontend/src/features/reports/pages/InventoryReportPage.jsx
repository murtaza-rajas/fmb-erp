import { Box, Card, CardContent, Stack, Chip } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import { useInventoryReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function InventoryReportPage() {
  const { data: rows, isLoading, isError, error, refetch } = useInventoryReportQuery();

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Item' },
    { key: 'category', header: 'Category' },
    { key: 'unit', header: 'Unit' },
    {
      key: 'currentQuantity',
      header: 'Current Qty',
      align: 'right',
      cell: (r) =>
        r.currentQuantity <= r.reorderLevel ? (
          <Chip size="small" color="warning" label={r.currentQuantity} />
        ) : (
          r.currentQuantity
        ),
    },
    { key: 'reorderLevel', header: 'Reorder Level', align: 'right' },
    { key: 'standardRate', header: 'Standard Rate', align: 'right', cell: (r) => currency(r.standardRate) },
    { key: 'stockValue', header: 'Stock Value', align: 'right', cell: (r) => currency(r.stockValue) },
  ];

  return (
    <Box>
      <PageHeader title="Inventory Report" subtitle="Current stock levels and valuation" />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="flex-end">
            <ExportButtons endpoint="/reports/inventory" params={{}} filename="inventory-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
