import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useTransfersQuery, useMarkTransferInTransitMutation, useCompleteTransferMutation } from '../transfersApi';
import TransferFormDialog from './TransferFormDialog';

export default function TransfersListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useTransfersQuery(queryParams);
  const canTransfer = usePermission('stock:transfer');
  const [creating, setCreating] = useState(false);
  const { mutateAsync: markInTransit } = useMarkTransferInTransitMutation();
  const { mutateAsync: complete } = useCompleteTransferMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleMarkInTransit = async (id) => {
    await markInTransit(id);
    enqueueSnackbar('Marked in-transit', { variant: 'success' });
  };

  const handleComplete = async (id) => {
    await complete(id);
    enqueueSnackbar('Transfer completed — stock updated at both stores', { variant: 'success' });
  };

  const columns = useMemo(
    () => [
      { header: 'From', accessorKey: 'fromStoreId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'To', accessorKey: 'toStoreId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Items', accessorKey: 'items', cell: (info) => info.getValue()?.length },
      { header: 'Status', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue()} /> },
      {
        header: '',
        id: 'actions',
        cell: (info) => {
          const t = info.row.original;
          if (!canTransfer) return null;
          if (t.status === 'pending') return <Button size="small" onClick={() => handleMarkInTransit(t._id)}>Mark In-Transit</Button>;
          if (t.status === 'in_transit') return <Button size="small" onClick={() => handleComplete(t._id)}>Complete</Button>;
          return null;
        },
      },
    ],
    [canTransfer]
  );

  return (
    <>
      <PageHeader
        title="Stock Transfers"
        subtitle="Move stock between stores"
        actions={canTransfer && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Transfer</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No transfers found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <TransferFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
