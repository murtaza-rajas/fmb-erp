import { useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import { useStockLedgerReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useAllItemsQuery } from '../../masters/items/itemsApi';
import { useStoresQuery } from '../../masters/stores/storesApi';

export default function StockLedgerReportPage() {
  const [filters, setFilters] = useState({ itemId: '', storeId: '', from: '', to: '' });
  const { data: rows, isLoading, isError, error, refetch } = useStockLedgerReportQuery(filters);
  const { data: items = [] } = useAllItemsQuery();
  const { data: storesData } = useStoresQuery({ limit: 200 });
  const stores = storesData?.items || [];

  const columns = [
    { key: 'date', header: 'Date', cell: (r) => (r.date ? dayjs(r.date).format('DD MMM YYYY, HH:mm') : '—') },
    { key: 'item', header: 'Item' },
    { key: 'store', header: 'Store' },
    { key: 'transactionType', header: 'Type', cell: (r) => <span style={{ textTransform: 'capitalize' }}>{r.transactionType?.replace(/_/g, ' ')}</span> },
    { key: 'quantity', header: 'Quantity', align: 'right' },
    { key: 'balanceAfter', header: 'Balance After', align: 'right' },
  ];

  return (
    <Box>
      <PageHeader title="Stock Ledger Report" subtitle="Stock movement history by item and store" />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="Item"
              size="small"
              sx={{ minWidth: 200 }}
              value={filters.itemId}
              onChange={(e) => setFilters((f) => ({ ...f, itemId: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {items.map((i) => (
                <MenuItem key={i._id} value={i._id}>
                  {i.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Store"
              size="small"
              sx={{ minWidth: 200 }}
              value={filters.storeId}
              onChange={(e) => setFilters((f) => ({ ...f, storeId: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {stores.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
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
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons endpoint="/reports/stock-ledger" params={filters} filename="stock-ledger-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
