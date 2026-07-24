import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useAdvancePaymentsQuery } from '../advancePaymentsApi';
import AdvancePaymentFormDialog from './AdvancePaymentFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function AdvancePaymentsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useAdvancePaymentsQuery(queryParams);
  const canCreate = usePermission('payment:create');
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Amount', accessorKey: 'amount', cell: (info) => currency(info.getValue()) },
      { header: 'Balance Remaining', accessorKey: 'balanceRemaining', cell: (info) => currency(info.getValue()) },
      { header: 'Paid At', accessorKey: 'paidAt', cell: (info) => dayjs(info.getValue()).format('DD MMM YYYY') },
      { header: 'Adjusted Against', accessorKey: 'adjustedAgainstInvoiceId', cell: (info) => info.getValue()?.invoiceNumber || '—' },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Advance Payments"
        subtitle="Payments made ahead of invoicing"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Advance</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No advance payments found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <AdvancePaymentFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
