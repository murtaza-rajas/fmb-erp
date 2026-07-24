import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useStockReturnsQuery } from '../stockReturnsApi';
import StockReturnFormDialog from './StockReturnFormDialog';

export default function StockReturnsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useStockReturnsQuery(queryParams);
  const canCreate = usePermission('stock:return');
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Items', accessorKey: 'items', cell: (info) => info.getValue()?.length },
      { header: 'Linked Debit Note', accessorKey: 'linkedDnId', cell: (info) => info.getValue()?.dnNumber || '—' },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Stock Returns"
        subtitle="Goods returned to vendor"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Stock Return</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No stock returns found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <StockReturnFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
