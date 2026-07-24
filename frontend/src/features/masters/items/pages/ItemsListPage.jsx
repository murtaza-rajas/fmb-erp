import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useItemsQuery, useDeleteItemMutation } from '../itemsApi';
import ItemFormDialog from './ItemFormDialog';

export default function ItemsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useItemsQuery(queryParams);
  const canCreate = usePermission('master:create');
  const canUpdate = usePermission('master:update');
  const canDelete = usePermission('master:delete');

  const [formTarget, setFormTarget] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { mutateAsync: deleteItem, isPending: deleting } = useDeleteItemMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleDelete = async () => {
    await deleteItem(deleteTarget._id);
    enqueueSnackbar('Item deleted', { variant: 'success' });
    setDeleteTarget(null);
  };

  const columns = useMemo(
    () => [
      { header: 'SKU', accessorKey: 'sku' },
      { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
      { header: 'Category', accessorKey: 'categoryId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Unit', accessorKey: 'unitId', cell: (info) => info.getValue()?.symbol || '—' },
      { header: 'Reorder Level', accessorKey: 'reorderLevel' },
      { header: 'Standard Rate', accessorKey: 'standardRate' },
      { header: 'Status', accessorKey: 'isActive', cell: (info) => <Chip size="small" label={info.getValue() ? 'Active' : 'Inactive'} color={info.getValue() ? 'success' : 'default'} variant="outlined" /> },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <>
            {canUpdate && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => setFormTarget(info.row.original)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => setDeleteTarget(info.row.original)}>
                  <DeleteOutlineIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ),
      },
    ],
    [canUpdate, canDelete]
  );

  return (
    <>
      <PageHeader
        title="Items"
        subtitle="Item master"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormTarget(null)}>New Item</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No items found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <ItemFormDialog open={formTarget !== undefined} onClose={() => setFormTarget(undefined)} item={formTarget} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete item"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
