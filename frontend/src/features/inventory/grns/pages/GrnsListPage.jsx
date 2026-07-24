import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useGrnsQuery } from '../grnsApi';
import GrnFormDialog from './GrnFormDialog';
import GrnDetailDialog from './GrnDetailDialog';

export default function GrnsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useGrnsQuery(queryParams);
  const canCreate = usePermission('grn:create');

  const [creating, setCreating] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  const columns = useMemo(
    () => [
      { header: 'GRN Number', accessorKey: 'grnNumber' },
      { header: 'PO', accessorKey: 'poId', cell: (info) => info.getValue()?.poNumber || '—' },
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Partial', accessorKey: 'isPartial', cell: (info) => (info.getValue() ? <Chip label="Partial" size="small" color="warning" variant="outlined" /> : '—') },
      { header: 'Received By', accessorKey: 'receivedBy', cell: (info) => info.getValue()?.name || '—' },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <Tooltip title="View">
            <IconButton size="small" onClick={() => setViewTarget(info.row.original)}>
              <VisibilityOutlinedIcon fontSize="small" />
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
        title="Goods Receipt Notes"
        subtitle="Record goods received against a Purchase Order"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New GRN</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No GRNs found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <GrnFormDialog open={creating} onClose={() => setCreating(false)} />
      <GrnDetailDialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} grn={viewTarget} />
    </>
  );
}
