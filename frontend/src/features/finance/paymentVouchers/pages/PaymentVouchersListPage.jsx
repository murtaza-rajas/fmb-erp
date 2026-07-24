import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { usePaymentVouchersQuery, useApprovePaymentVoucherMutation } from '../paymentVouchersApi';
import PaymentVoucherFormDialog from './PaymentVoucherFormDialog';
import RejectVoucherDialog from './RejectVoucherDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function PaymentVouchersListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = usePaymentVouchersQuery(queryParams);
  const canCreate = usePermission('payment_voucher:create');
  const canApprove = usePermission('payment_voucher:approve');
  const canReject = usePermission('payment_voucher:reject');

  const [creating, setCreating] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const { mutateAsync: approve, isPending: approving, error: approveError } = useApprovePaymentVoucherMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleApprove = async () => {
    try {
      await approve(approveTarget._id);
      enqueueSnackbar('Voucher approved', { variant: 'success' });
      setApproveTarget(null);
    } catch {
      // error surfaces in the confirm dialog via approveError
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Voucher #', accessorKey: 'voucherNumber' },
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Amount', accessorKey: 'amount', cell: (info) => currency(info.getValue()) },
      { header: 'Mode', accessorKey: 'paymentMode', cell: (info) => info.getValue()?.toUpperCase() },
      { header: 'Status', accessorKey: 'approvalStatus', cell: (info) => <StatusBadge status={info.getValue()} /> },
      {
        header: '',
        id: 'actions',
        cell: (info) => {
          const v = info.row.original;
          if (v.approvalStatus !== 'pending') return null;
          return (
            <>
              {canApprove && (
                <Tooltip title="Approve">
                  <IconButton size="small" onClick={() => setApproveTarget(v)}>
                    <CheckCircleOutlineIcon fontSize="small" color="success" />
                  </IconButton>
                </Tooltip>
              )}
              {canReject && (
                <Tooltip title="Reject">
                  <IconButton size="small" onClick={() => setRejectTarget(v)}>
                    <CancelOutlinedIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          );
        },
      },
    ],
    [canApprove, canReject]
  );

  return (
    <>
      <PageHeader
        title="Payment Vouchers"
        subtitle="The SOP's single approval gate — restricted to paid staff"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Voucher</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No payment vouchers found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <PaymentVoucherFormDialog open={creating} onClose={() => setCreating(false)} />
      <RejectVoucherDialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} voucher={rejectTarget} />
      <ConfirmDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        loading={approving}
        title="Approve payment voucher"
        description={approveError?.response?.data?.error?.message || `Approve ${approveTarget?.voucherNumber} for ${currency(approveTarget?.amount)}?`}
        confirmLabel="Approve"
        confirmColor="success"
      />
    </>
  );
}
