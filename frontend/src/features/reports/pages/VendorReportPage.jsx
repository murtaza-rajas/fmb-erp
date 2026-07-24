import { Box, Card, CardContent, Stack } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import { useVendorReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function VendorReportPage() {
  const { data: rows, isLoading, isError, error, refetch } = useVendorReportQuery();

  const columns = [
    { key: 'name', header: 'Vendor' },
    { key: 'totalPurchaseOrders', header: 'Purchase Orders', align: 'right' },
    { key: 'totalPurchaseAmount', header: 'Total Purchase Amount', align: 'right', cell: (r) => currency(r.totalPurchaseAmount) },
    { key: 'totalDebitNotes', header: 'Debit Notes', align: 'right' },
    { key: 'totalDebitAmount', header: 'Total Debit Amount', align: 'right', cell: (r) => currency(r.totalDebitAmount) },
    { key: 'outstandingBalance', header: 'Outstanding Balance', align: 'right', cell: (r) => currency(r.outstandingBalance) },
  ];

  return (
    <Box>
      <PageHeader title="Vendor Report" subtitle="Purchase and outstanding balance summary per vendor" />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="flex-end">
            <ExportButtons endpoint="/reports/vendors" params={{}} filename="vendor-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
