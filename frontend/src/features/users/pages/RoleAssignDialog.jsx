import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Alert, CircularProgress, Stack } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAllRolesQuery } from '../../roles/rolesApi';
import { useAssignUserRoleMutation } from '../usersApi';

export default function RoleAssignDialog({ open, onClose, user }) {
  const { data: roles = [] } = useAllRolesQuery();
  const [roleId, setRoleId] = useState('');
  const { mutateAsync, isPending, error, reset } = useAssignUserRoleMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleClose = () => {
    reset();
    setRoleId('');
    onClose();
  };

  const handleSubmit = async () => {
    try {
      await mutateAsync({ id: user._id, roleId });
      enqueueSnackbar('Role updated', { variant: 'success' });
      handleClose();
    } catch {
      // surfaced via `error` below — this is where the staffType gate's
      // 403 (payment-approval restricted to paid staff) would show up.
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Role — {user?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to update role'}</Alert>}
          <TextField select label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} fullWidth size="small">
            {roles.map((r) => (
              <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isPending}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending || !roleId}>
          {isPending ? <CircularProgress size={20} color="inherit" /> : 'Update Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
