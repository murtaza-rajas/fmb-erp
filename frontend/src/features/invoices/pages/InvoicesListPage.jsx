import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, Tooltip, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { usePermission } from '../../../hooks/usePermission';
import { useTableState } from '../../../hooks/useTableState';
import { useInvoicesQuery } from '../invoicesApi';
import InvoiceFormDialog from './InvoiceFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function InvoicesListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useInvoicesQuery(queryParams);
  const canCreate = usePermission('invoice:create');
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      { header: 'Invoice #', accessorKey: 'invoiceNumber' },
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'PO', accessorKey: 'poId', cell: (info) => info.getValue()?.poNumber || '—' },
      { header: 'Total Amount', accessorKey: 'totalAmount', cell: (info) => currency(info.getValue()) },
      {
        header: 'Match / Hold',
        id: 'status',
        cell: (info) => (
          <Stack direction="row" spacing={0.5}>
            <StatusBadge status={info.row.original.matchStatus} />
            {info.row.original.holdStatus === 'on_hold' && <StatusBadge status={info.row.original.holdStatus} />}
          </Stack>
        ),
      },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => navigate(`/invoices/${info.row.original._id}`)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [navigate]
  );

  return (
    <>
      <PageHeader
        title="Vendor Invoices"
        subtitle="Three-way match against PO + GRN"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Invoice</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No invoices found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <InvoiceFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
