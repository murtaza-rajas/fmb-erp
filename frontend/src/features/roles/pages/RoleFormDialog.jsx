import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import { useCreateRoleMutation } from '../rolesApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  description: yup.string().nullable(),
});

export default function RoleFormDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { name: '', description: '' } });
  const { mutateAsync, isPending, error } = useCreateRoleMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Role created — assign permissions next', { variant: 'success' });
      methods.reset();
      onClose();
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Role</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create role'}</Alert>}
              <FormTextField name="name" label="Role Name" autoFocus />
              <FormTextField name="description" label="Description" multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Role'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
