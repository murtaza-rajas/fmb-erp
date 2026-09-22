import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, IconButton, Tooltip, Chip, Card, CardContent, Stack, TextField, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useStoresQuery } from '../../../masters/stores/storesApi';
import { useRequisitionsQuery, useCancelRequisitionMutation } from '../requisitionsApi';
import RequisitionFormDialog from './RequisitionFormDialog';
import RequisitionDetailDialog from './RequisitionDetailDialog';
import VendorFormDialog from '../../../masters/vendors/pages/VendorFormDialog';

const STATUS_OPTIONS = ['submitted', 'converted_to_po', 'cancelled'];

export default function RequisitionsListPage() {
  const { queryParams, tableProps } = useTableState();
  const [filters, setFilters] = useState({ storeId: '', status: '', from: '', to: '' });
  const { data: storesData } = useStoresQuery({ limit: 100 });
  const { data, isLoading, isError, error, refetch } = useRequisitionsQuery({
    ...queryParams,
    filter: {
      ...(filters.storeId && { storeId: filters.storeId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    },
  });
  const canCreate = usePermission('prn:create');
  const canUpdate = usePermission('prn:update');
  const canCancel = usePermission('prn:cancel');
  const canCreateVendor = usePermission('master:create');

  const [formTarget, setFormTarget] = useState(undefined);
  const [addingVendor, setAddingVendor] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const { mutateAsync: cancelPrn, isPending: cancelling } = useCancelRequisitionMutation();
  const { enqueueSnackbar } = useSnackbar();

  const updateFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    tableProps.onPageChange(1);
  };

  const handleCancel = async () => {
    await cancelPrn(cancelTarget._id);
    enqueueSnackbar('Requisition cancelled', { variant: 'success' });
    setCancelTarget(null);
  };

  const columns = useMemo(
    () => [
      { header: 'PRN Number', accessorKey: 'prnNumber' },
      { header: 'Requisition Date', accessorKey: 'requisitionDate', cell: (info) => (info.getValue() ? dayjs(info.getValue()).format('DD MMM YYYY') : '—') },
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
            {canUpdate && info.row.original.status === 'submitted' && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => setFormTarget(info.row.original)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
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
    [canUpdate, canCancel]
  );

  return (
    <>
      <PageHeader
        title="Purchase Requisitions"
        subtitle="Store-raised stock requests"
        actions={
          <>
            {canCreateVendor && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingVendor(true)}>
                New Vendor
              </Button>
            )}
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormTarget(null)}>New Requisition</Button>
            )}
          </>
        }
      />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="Store"
              size="small"
              sx={{ minWidth: 180 }}
              value={filters.storeId}
              onChange={(e) => updateFilter({ storeId: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {(storesData?.items || []).map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              size="small"
              sx={{ minWidth: 180 }}
              value={filters.status}
              onChange={(e) => updateFilter({ status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="From"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.from}
              onChange={(e) => updateFilter({ from: e.target.value })}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.to}
              onChange={(e) => updateFilter({ to: e.target.value })}
            />
          </Stack>
        </CardContent>
      </Card>

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

      <RequisitionFormDialog open={formTarget !== undefined} onClose={() => setFormTarget(undefined)} requisition={formTarget} />
      <VendorFormDialog open={addingVendor} onClose={() => setAddingVendor(false)} />
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
