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
import { useCreditNotesQuery, useSettleCreditNoteMutation } from '../creditNotesApi';
import CreditNoteFormDialog from './CreditNoteFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function CreditNotesListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useCreditNotesQuery(queryParams);
  const canCreate = usePermission('credit_note:create');
  const canUpdate = usePermission('credit_note:update');
  const [creating, setCreating] = useState(false);
  const { mutateAsync: settle } = useSettleCreditNoteMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleSettle = async (id) => {
    await settle(id);
    enqueueSnackbar('Credit note settled', { variant: 'success' });
  };

  const columns = useMemo(
    () => [
      { header: 'CN Number', accessorKey: 'cnNumber' },
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Amount', accessorKey: 'amount', cell: (info) => currency(info.getValue()) },
      { header: 'Reason', accessorKey: 'reason' },
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
        title="Credit Notes"
        subtitle="Credits owed by the vendor (e.g. price corrections)"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Credit Note</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No credit notes found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <CreditNoteFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
