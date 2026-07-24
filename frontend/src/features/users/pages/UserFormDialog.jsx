import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import FormSelect from '../../../components/form/FormSelect';
import { createUserSchema, updateUserSchema } from '../usersValidation';
import { useCreateUserMutation, useUpdateUserMutation } from '../usersApi';
import { useAllRolesQuery } from '../../roles/rolesApi';

const STAFF_TYPE_OPTIONS = [
  { value: 'paid', label: 'Paid Staff' },
  { value: 'khidmat_gujar', label: 'Khidmat Gujar' },
];

export default function UserFormDialog({ open, onClose, user }) {
  const isEdit = Boolean(user);
  const { data: roles = [] } = useAllRolesQuery();

  const methods = useForm({
    resolver: yupResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: { name: '', email: '', password: '', roleId: '', staffType: 'paid', phone: '' },
  });

  useEffect(() => {
    if (open) {
      methods.reset(
        user
          ? { name: user.name, phone: user.phone || '' }
          : { name: '', email: '', password: '', roleId: '', staffType: 'paid', phone: '' }
      );
    }
  }, [open, user, methods]);

  const { mutateAsync: createUser, isPending: creating, error: createError } = useCreateUserMutation();
  const { mutateAsync: updateUser, isPending: updating, error: updateError } = useUpdateUserMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateUser({ id: user._id, ...values });
        enqueueSnackbar('User updated', { variant: 'success' });
      } else {
        await createUser(values);
        enqueueSnackbar('User created', { variant: 'success' });
      }
      onClose();
    } catch {
      // surfaced via error state below
    }
  };

  const error = createError || updateError;
  const isPending = creating || updating;
  const roleOptions = roles.map((r) => ({ value: r._id, label: r.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit User' : 'New User'}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to save user'}</Alert>}
              <FormTextField name="name" label="Full Name" autoFocus />
              {!isEdit && <FormTextField name="email" label="Email" type="email" />}
              {!isEdit && <FormTextField name="password" label="Password" type="password" />}
              {!isEdit && <FormSelect name="roleId" label="Role" options={roleOptions} />}
              {!isEdit && <FormSelect name="staffType" label="Staff Type" options={STAFF_TYPE_OPTIONS} />}
              <FormTextField name="phone" label="Phone" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
