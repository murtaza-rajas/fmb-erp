import { useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import { usePaymentReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useAllVendorsQuery } from '../../masters/vendors/vendorsApi';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function PaymentReportPage() {
  const [filters, setFilters] = useState({ from: '', to: '', vendorId: '' });
  const { data: rows, isLoading, isError, error, refetch } = usePaymentReportQuery(filters);
  const { data: vendors = [] } = useAllVendorsQuery();

  const columns = [
    { key: 'voucherNumber', header: 'Voucher #' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'paidAmount', header: 'Paid Amount', align: 'right', cell: (r) => currency(r.paidAmount) },
    { key: 'paymentMode', header: 'Mode' },
    { key: 'transactionRef', header: 'Transaction Ref', cell: (r) => r.transactionRef || '—' },
    { key: 'paidAt', header: 'Paid At', cell: (r) => (r.paidAt ? dayjs(r.paidAt).format('DD MMM YYYY, HH:mm') : '—') },
  ];

  return (
    <Box>
      <PageHeader title="Payment Report" subtitle="Processed payments by date range and vendor" />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="From"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
            <TextField
              select
              label="Vendor"
              size="small"
              sx={{ minWidth: 200 }}
              value={filters.vendorId}
              onChange={(e) => setFilters((f) => ({ ...f, vendorId: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v._id} value={v._id}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons endpoint="/reports/payments" params={filters} filename="payment-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
