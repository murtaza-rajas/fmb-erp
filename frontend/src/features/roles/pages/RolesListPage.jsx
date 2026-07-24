import { useMemo, useState } from 'react';
import { Button, IconButton, Chip, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { usePermission } from '../../../hooks/usePermission';
import { useTableState } from '../../../hooks/useTableState';
import { useRolesQuery, useDeleteRoleMutation } from '../rolesApi';
import RoleFormDialog from './RoleFormDialog';
import RolePermissionsDialog from './RolePermissionsDialog';

export default function RolesListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useRolesQuery(queryParams);
  const canCreate = usePermission('role:create');
  const canUpdate = usePermission('role:update');
  const canDelete = usePermission('role:delete');

  const [creating, setCreating] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { mutateAsync: deleteRole, isPending: deleting, error: deleteError } = useDeleteRoleMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleDelete = async () => {
    try {
      await deleteRole(deleteTarget._id);
      enqueueSnackbar('Role deleted', { variant: 'success' });
      setDeleteTarget(null);
    } catch {
      // deleteError renders in the dialog via a re-render below
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        meta: { sortKey: 'name' },
        cell: (info) => (
          <>
            {info.getValue()}
            {info.row.original.isSystemRole && <Chip label="system" size="small" variant="outlined" sx={{ ml: 1 }} />}
          </>
        ),
      },
      { header: 'Description', accessorKey: 'description', cell: (info) => info.getValue() || '—' },
      { header: 'Permissions', accessorKey: 'permissions', cell: (info) => `${info.getValue()?.length || 0} granted` },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <>
            {canUpdate && (
              <Tooltip title="Manage permissions">
                <IconButton size="small" onClick={() => setPermissionsTarget(info.row.original)}>
                  <KeyOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && !info.row.original.isSystemRole && (
              <Tooltip title="Delete role">
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
        title="Roles & Permissions"
        subtitle="Configure what each role can access"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Role</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No roles found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <RoleFormDialog open={creating} onClose={() => setCreating(false)} />
      <RolePermissionsDialog open={Boolean(permissionsTarget)} onClose={() => setPermissionsTarget(null)} role={permissionsTarget} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete role"
        description={deleteError?.response?.data?.error?.message || `Delete "${deleteTarget?.name}"? Roles with active users assigned cannot be deleted.`}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
