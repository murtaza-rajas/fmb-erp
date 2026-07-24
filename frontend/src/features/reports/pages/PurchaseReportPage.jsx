import { useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import { usePurchaseReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const STATUS_OPTIONS = ['draft', 'issued', 'partially_received', 'received', 'invoiced', 'payment_pending', 'paid', 'closed'];

export default function PurchaseReportPage() {
  const [filters, setFilters] = useState({ from: '', to: '', status: '' });
  const { data: rows, isLoading, isError, error, refetch } = usePurchaseReportQuery(filters);

  const columns = [
    { key: 'poNumber', header: 'PO Number' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'status', header: 'Status' },
    { key: 'totalAmount', header: 'Total Amount', align: 'right', cell: (r) => currency(r.totalAmount) },
    { key: 'issuedAt', header: 'Issued At', cell: (r) => (r.issuedAt ? dayjs(r.issuedAt).format('DD MMM YYYY') : '—') },
  ];

  return (
    <Box>
      <PageHeader title="Purchase Report" subtitle="Purchase orders by date range and status" />
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
              label="Status"
              size="small"
              sx={{ minWidth: 180 }}
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                  {s.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons endpoint="/reports/purchases" params={filters} filename="purchase-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
