import { useMemo, useState } from 'react';
import { Button, IconButton, Menu, MenuItem, Chip, ListItemIcon, ListItemText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { usePermission } from '../../../hooks/usePermission';
import { useTableState } from '../../../hooks/useTableState';
import { useUsersQuery, useUpdateUserStatusMutation, useDeleteUserMutation } from '../usersApi';
import UserFormDialog from './UserFormDialog';
import RoleAssignDialog from './RoleAssignDialog';

export default function UsersListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useUsersQuery(queryParams);
  const canCreate = usePermission('user:create');
  const canUpdate = usePermission('user:update');
  const canManageRoles = usePermission('user:manage_roles');
  const canDelete = usePermission('user:delete');

  const [formTarget, setFormTarget] = useState(undefined); // undefined=closed, null=create, user=edit
  const [roleTarget, setRoleTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuState, setMenuState] = useState(null); // { anchorEl, user }

  const { mutateAsync: updateStatus } = useUpdateUserStatusMutation();
  const { mutateAsync: deleteUser, isPending: deleting } = useDeleteUserMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await updateStatus({ id: user._id, status: newStatus });
    enqueueSnackbar(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, { variant: 'success' });
    setMenuState(null);
  };

  const handleDelete = async () => {
    await deleteUser(deleteTarget._id);
    enqueueSnackbar('User deleted', { variant: 'success' });
    setDeleteTarget(null);
  };

  const columns = useMemo(
    () => [
      { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
      { header: 'Email', accessorKey: 'email' },
      { header: 'Role', accessorKey: 'roleId', cell: (info) => info.getValue()?.name || '—' },
      {
        header: 'Staff Type',
        accessorKey: 'staffType',
        cell: (info) => <Chip size="small" variant="outlined" label={info.getValue() === 'paid' ? 'Paid' : 'Khidmat Gujar'} />,
      },
      { header: 'Status', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue()} /> },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <IconButton size="small" onClick={(e) => setMenuState({ anchorEl: e.currentTarget, user: info.row.original })}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage user accounts and access"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormTarget(null)}>New User</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No users found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <Menu anchorEl={menuState?.anchorEl} open={Boolean(menuState)} onClose={() => setMenuState(null)}>
        {canUpdate && (
          <MenuItem onClick={() => { setFormTarget(menuState.user); setMenuState(null); }}>
            <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {canManageRoles && (
          <MenuItem onClick={() => { setRoleTarget(menuState.user); setMenuState(null); }}>
            <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Change Role</ListItemText>
          </MenuItem>
        )}
        {canUpdate && (
          <MenuItem onClick={() => handleToggleStatus(menuState.user)}>
            <ListItemIcon>{menuState?.user.status === 'active' ? <BlockIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}</ListItemIcon>
            <ListItemText>{menuState?.user.status === 'active' ? 'Deactivate' : 'Activate'}</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => { setDeleteTarget(menuState.user); setMenuState(null); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <UserFormDialog open={formTarget !== undefined} onClose={() => setFormTarget(undefined)} user={formTarget} />
      <RoleAssignDialog open={Boolean(roleTarget)} onClose={() => setRoleTarget(null)} user={roleTarget} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete user"
        description={`This will remove ${deleteTarget?.name}'s access. This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
