import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useExpensesQuery, useApproveExpenseMutation } from '../expensesApi';
import ExpenseFormDialog from './ExpenseFormDialog';
import RejectExpenseDialog from './RejectExpenseDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const CATEGORY_LABELS = {
  salary: 'Salary',
  wages: 'Wages',
  rent: 'Rent',
  utilities: 'Utilities',
  office_supplies: 'Office Supplies',
  travel: 'Travel',
  other: 'Other',
};

export default function ExpensesListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useExpensesQuery(queryParams);
  const canCreate = usePermission('expense:create');
  const canApprove = usePermission('expense:approve');
  const canReject = usePermission('expense:reject');

  const [creating, setCreating] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const { mutateAsync: approveExpense, isPending: approving } = useApproveExpenseMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleApprove = async () => {
    await approveExpense(approveTarget._id);
    enqueueSnackbar('Expense approved', { variant: 'success' });
    setApproveTarget(null);
  };

  const columns = useMemo(
    () => [
      { header: 'Expense #', accessorKey: 'expenseNumber' },
      { header: 'Category', accessorKey: 'category', cell: (info) => CATEGORY_LABELS[info.getValue()] || info.getValue() },
      { header: 'Paid To', accessorKey: 'payeeName' },
      { header: 'Amount', accessorKey: 'amount', cell: (info) => currency(info.getValue()) },
      { header: 'Date', accessorKey: 'expenseDate', cell: (info) => (info.getValue() ? dayjs(info.getValue()).format('DD MMM YYYY') : '—') },
      { header: 'Status', accessorKey: 'approvalStatus', cell: (info) => <StatusBadge status={info.getValue()} /> },
      {
        header: '',
        id: 'actions',
        cell: (info) => {
          const e = info.row.original;
          if (e.approvalStatus !== 'pending') return null;
          return (
            <>
              {canApprove && (
                <Tooltip title="Approve">
                  <IconButton size="small" onClick={() => setApproveTarget(e)}>
                    <CheckCircleOutlineIcon fontSize="small" color="success" />
                  </IconButton>
                </Tooltip>
              )}
              {canReject && (
                <Tooltip title="Reject">
                  <IconButton size="small" onClick={() => setRejectTarget(e)}>
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
        title="Expenses"
        subtitle="HR / Administration expenses — salary, wages, rent, utilities and other non-vendor costs"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Expense</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No expenses found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <ExpenseFormDialog open={creating} onClose={() => setCreating(false)} />
      <RejectExpenseDialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} expense={rejectTarget} />
      <ConfirmDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        loading={approving}
        title="Approve expense"
        description={`Approve ${approveTarget?.expenseNumber} for ${currency(approveTarget?.amount)} paid to ${approveTarget?.payeeName}?`}
        confirmLabel="Approve"
        confirmColor="success"
      />
    </>
  );
}
