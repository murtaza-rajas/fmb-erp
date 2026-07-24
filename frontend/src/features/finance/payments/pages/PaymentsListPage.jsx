import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import dayjs from 'dayjs';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { usePaymentsQuery, downloadPaymentAdvicePdf } from '../paymentsApi';
import ProcessPaymentDialog from './ProcessPaymentDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function PaymentsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = usePaymentsQuery(queryParams);
  const canCreate = usePermission('payment:create');
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      { header: 'Voucher #', accessorKey: 'voucherId', cell: (info) => info.getValue()?.voucherNumber || '—' },
      { header: 'Paid Amount', accessorKey: 'paidAmount', cell: (info) => currency(info.getValue()) },
      { header: 'Transaction Ref', accessorKey: 'transactionRef', cell: (info) => info.getValue() || '—' },
      { header: 'Paid At', accessorKey: 'paidAt', cell: (info) => dayjs(info.getValue()).format('DD MMM YYYY, HH:mm') },
      { header: 'Paid By', accessorKey: 'paidBy', cell: (info) => info.getValue()?.name || '—' },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <Tooltip title="Download payment advice">
            <IconButton size="small" onClick={() => downloadPaymentAdvicePdf(info.row.original._id)}>
              <PictureAsPdfOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Processed payments against approved vouchers"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>Process Payment</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No payments found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <ProcessPaymentDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
