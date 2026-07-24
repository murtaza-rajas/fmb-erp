import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useRequisitionsQuery, useCancelRequisitionMutation } from '../requisitionsApi';
import RequisitionFormDialog from './RequisitionFormDialog';
import RequisitionDetailDialog from './RequisitionDetailDialog';

export default function RequisitionsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useRequisitionsQuery(queryParams);
  const canCreate = usePermission('prn:create');
  const canCancel = usePermission('prn:cancel');

  const [creating, setCreating] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const { mutateAsync: cancelPrn, isPending: cancelling } = useCancelRequisitionMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleCancel = async () => {
    await cancelPrn(cancelTarget._id);
    enqueueSnackbar('Requisition cancelled', { variant: 'success' });
    setCancelTarget(null);
  };

  const columns = useMemo(
    () => [
      { header: 'PRN Number', accessorKey: 'prnNumber' },
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Requested By', accessorKey: 'requestedBy', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Items', accessorKey: 'items', cell: (info) => info.getValue()?.length },
      { header: 'Emergency', accessorKey: 'isEmergency', cell: (info) => (info.getValue() ? <Chip label="Emergency" size="small" color="error" variant="outlined" /> : '—') },
      { header: 'Status', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue()} /> },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <>
            <Tooltip title="View">
              <IconButton size="small" onClick={() => setViewTarget(info.row.original)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canCancel && info.row.original.status === 'submitted' && (
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={() => setCancelTarget(info.row.original)}>
                  <CancelOutlinedIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ),
      },
    ],
    [canCancel]
  );

  return (
    <>
      <PageHeader
        title="Purchase Requisitions"
        subtitle="Store-raised stock requests"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Requisition</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No requisitions found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <RequisitionFormDialog open={creating} onClose={() => setCreating(false)} />
      <RequisitionDetailDialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} requisition={viewTarget} />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel requisition"
        description={`Cancel ${cancelTarget?.prnNumber}? This cannot be undone.`}
        confirmLabel="Cancel Requisition"
        confirmColor="error"
      />
    </>
  );
}
