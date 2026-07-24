import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import FormSelect from '../../../components/form/FormSelect';
import FormCheckbox from '../../../components/form/FormCheckbox';
import { useAllRolesQuery } from '../../roles/rolesApi';
import { useCreateApprovalMatrixEntryMutation, useUpdateApprovalMatrixEntryMutation } from '../settingsApi';

const schema = yup.object({
  module: yup.string().required('Module is required'),
  amountThreshold: yup.number().typeError('Must be a number').min(0, 'Must be 0 or more').required('Amount threshold is required'),
  requiredApproverRoleId: yup.string().required('Approver role is required'),
  isActive: yup.boolean(),
});

export default function ApprovalMatrixFormDialog({ open, onClose, entry }) {
  const isEditing = Boolean(entry);
  const { data: roles = [] } = useAllRolesQuery();
  const { mutateAsync: createEntry, isPending: creating, error: createError } = useCreateApprovalMatrixEntryMutation();
  const { mutateAsync: updateEntry, isPending: updating, error: updateError } = useUpdateApprovalMatrixEntryMutation();
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { module: 'emergency_purchase', amountThreshold: '', requiredApproverRoleId: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      methods.reset({
        module: entry?.module || 'emergency_purchase',
        amountThreshold: entry?.amountThreshold ?? '',
        requiredApproverRoleId: entry?.requiredApproverRoleId?._id || entry?.requiredApproverRoleId || '',
        isActive: entry ? Boolean(entry.isActive) : true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry]);

  const onSubmit = async (values) => {
    try {
      if (isEditing) {
        const { module: _module, ...updatable } = values;
        await updateEntry({ id: entry._id, ...updatable });
        enqueueSnackbar('Approval matrix entry updated', { variant: 'success' });
      } else {
        await createEntry(values);
        enqueueSnackbar('Approval matrix entry created', { variant: 'success' });
      }
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const roleOptions = roles.map((r) => ({ value: r._id, label: r.name }));
  const isPending = creating || updating;
  const error = createError || updateError;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Approval Rule' : 'New Approval Rule'}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to save approval rule'}</Alert>}
              <FormTextField name="module" label="Module" disabled={isEditing} autoFocus={!isEditing} />
              <FormTextField name="amountThreshold" label="Amount Threshold" type="number" />
              <FormSelect name="requiredApproverRoleId" label="Required Approver Role" options={roleOptions} />
              <FormCheckbox name="isActive" label="Active" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : isEditing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
