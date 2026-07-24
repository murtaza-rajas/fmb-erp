import { useMemo, useState } from 'react';
import { Box, Grid, TextField, MenuItem, Chip } from '@mui/material';
import dayjs from 'dayjs';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { useTableState } from '../../../../hooks/useTableState';
import { useStockLedgerQuery } from '../stockLedgerApi';
import { useAllItemsQuery } from '../../../masters/items/itemsApi';
import { useStoresQuery } from '../../../masters/stores/storesApi';

const TXN_TYPE_COLOR = {
  grn_in: 'success',
  issue_out: 'default',
  adjustment: 'info',
  transfer_in: 'success',
  transfer_out: 'warning',
  return_out: 'error',
};

export default function StockLedgerPage() {
  const { queryParams, tableProps } = useTableState();
  const [itemId, setItemId] = useState('');
  const [storeId, setStoreId] = useState('');

  const { data, isLoading, isError, error, refetch } = useStockLedgerQuery({ ...queryParams, itemId: itemId || undefined, storeId: storeId || undefined });
  const { data: items = [] } = useAllItemsQuery();
  const { data: storesData } = useStoresQuery({ limit: 100 });

  const columns = useMemo(
    () => [
      { header: 'Date', accessorKey: 'timestamp', cell: (info) => dayjs(info.getValue()).format('DD MMM YYYY, HH:mm') },
      { header: 'Item', accessorKey: 'itemId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Type', accessorKey: 'transactionType', cell: (info) => <Chip size="small" label={info.getValue().replace(/_/g, ' ')} color={TXN_TYPE_COLOR[info.getValue()] || 'default'} variant="outlined" /> },
      { header: 'Quantity', accessorKey: 'quantity', cell: (info) => (info.getValue() > 0 ? `+${info.getValue()}` : info.getValue()) },
      { header: 'Balance After', accessorKey: 'balanceAfter' },
    ],
    []
  );

  return (
    <Box>
      <PageHeader title="Stock Ledger" subtitle="Append-only movement history for every item" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField select label="Filter by Item" value={itemId} onChange={(e) => setItemId(e.target.value)} fullWidth size="small">
            <MenuItem value="">All Items</MenuItem>
            {items.map((i) => <MenuItem key={i._id} value={i._id}>{i.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField select label="Filter by Store" value={storeId} onChange={(e) => setStoreId(e.target.value)} fullWidth size="small">
            <MenuItem value="">All Stores</MenuItem>
            {(storesData?.items || []).map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No stock movements found"
        getRowId={(row) => row._id}
        page={tableProps.page}
        limit={tableProps.limit}
        onPageChange={tableProps.onPageChange}
        onLimitChange={tableProps.onLimitChange}
      />
    </Box>
  );
}
