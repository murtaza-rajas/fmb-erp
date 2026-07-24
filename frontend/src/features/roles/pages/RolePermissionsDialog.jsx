import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel,
  Checkbox, Typography, Stack, Divider, Alert, CircularProgress, Chip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { usePermissionsQuery, useUpdateRolePermissionsMutation } from '../rolesApi';

function groupByModule(permissions) {
  return permissions.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});
}

export default function RolePermissionsDialog({ open, onClose, role }) {
  const { data: allPermissions = [] } = usePermissionsQuery();
  const { mutateAsync, isPending, error } = useUpdateRolePermissionsMutation();
  const { enqueueSnackbar } = useSnackbar();
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (open && role) {
      setSelected(new Set(role.permissions.map((p) => p._id)));
    }
  }, [open, role]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await mutateAsync({ id: role._id, permissionIds: Array.from(selected) });
      enqueueSnackbar('Permissions updated', { variant: 'success' });
      onClose();
    } catch {
      // surfaced via `error` below — this is also where the staffType
      // gate would reject adding payment_voucher:approve to a role that
      // has khidmat_gujar members.
    }
  };

  const grouped = groupByModule(allPermissions);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Permissions — {role?.name}</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 480 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error.response?.data?.error?.message || 'Failed to update permissions'}</Alert>}
        <Stack spacing={2}>
          {Object.entries(grouped).map(([module, perms]) => (
            <Stack key={module} spacing={0.5}>
              <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                {module.replace(/_/g, ' ')}
              </Typography>
              <Stack direction="row" flexWrap="wrap">
                {perms.map((p) => (
                  <FormControlLabel
                    key={p._id}
                    sx={{ width: { xs: '100%', sm: '50%' } }}
                    control={<Checkbox size="small" checked={selected.has(p._id)} onChange={() => toggle(p._id)} />}
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2">{p.action}</Typography>
                        {p.isPaymentApprovalGate && <Chip label="paid staff only" size="small" color="warning" variant="outlined" />}
                      </Stack>
                    }
                  />
                ))}
              </Stack>
              <Divider />
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={isPending}>
          {isPending ? <CircularProgress size={20} color="inherit" /> : 'Save Permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
