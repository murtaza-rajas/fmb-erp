import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useAdjustmentsQuery } from '../adjustmentsApi';
import AdjustmentFormDialog from './AdjustmentFormDialog';

export default function AdjustmentsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useAdjustmentsQuery(queryParams);
  const canCreate = usePermission('stock:adjust');
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      { header: 'Item', accessorKey: 'itemId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Quantity', accessorKey: 'quantity', cell: (info) => (info.getValue() > 0 ? `+${info.getValue()}` : info.getValue()) },
      { header: 'Reason', accessorKey: 'reason' },
      { header: 'Approved By', accessorKey: 'approvedBy', cell: (info) => info.getValue()?.name || '—' },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Manual stock corrections"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Adjustment</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No adjustments found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <AdjustmentFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
