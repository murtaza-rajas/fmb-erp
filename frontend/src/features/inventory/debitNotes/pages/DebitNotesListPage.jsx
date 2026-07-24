import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useDebitNotesQuery, useSettleDebitNoteMutation } from '../debitNotesApi';
import DebitNoteFormDialog from './DebitNoteFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function DebitNotesListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useDebitNotesQuery(queryParams);
  const canCreate = usePermission('debit_note:create');
  const canUpdate = usePermission('debit_note:update');
  const [creating, setCreating] = useState(false);
  const { mutateAsync: settle } = useSettleDebitNoteMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleSettle = async (id) => {
    await settle(id);
    enqueueSnackbar('Debit note settled', { variant: 'success' });
  };

  const columns = useMemo(
    () => [
      { header: 'DN Number', accessorKey: 'dnNumber' },
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'PO', accessorKey: 'poId', cell: (info) => info.getValue()?.poNumber || '—' },
      { header: 'Total Amount', accessorKey: 'totalAmount', cell: (info) => currency(info.getValue()) },
      { header: 'Status', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue()} /> },
      {
        header: '',
        id: 'actions',
        cell: (info) =>
          canUpdate && info.row.original.status === 'open' && (
            <Tooltip title="Mark settled">
              <IconButton size="small" onClick={() => handleSettle(info.row.original._id)}>
                <CheckCircleOutlineIcon fontSize="small" color="success" />
              </IconButton>
            </Tooltip>
          ),
      },
    ],
    [canUpdate]
  );

  return (
    <>
      <PageHeader
        title="Debit Notes"
        subtitle="Amounts excluded from vendor payment (damaged/rejected goods, returns)"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Debit Note</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No debit notes found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <DebitNoteFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
