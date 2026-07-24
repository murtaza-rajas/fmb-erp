import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import FormCheckbox from '../../../../components/form/FormCheckbox';
import { useAddVendorBankAccountMutation } from '../vendorsApi';

const schema = yup.object({
  accountHolderName: yup.string().required('Required'),
  bankName: yup.string().required('Required'),
  accountNumber: yup.string().required('Required'),
  ifsc: yup.string().required('Required'),
  isPrimary: yup.boolean(),
});

export default function AddBankAccountDialog({ open, onClose, vendorId }) {
  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { accountHolderName: '', bankName: '', accountNumber: '', ifsc: '', isPrimary: false },
  });
  const { mutateAsync, isPending, error } = useAddVendorBankAccountMutation(vendorId);
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Bank account added', { variant: 'success' });
      methods.reset();
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Bank Account</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to add bank account'}</Alert>}
              <FormTextField name="accountHolderName" label="Account Holder Name" autoFocus />
              <FormTextField name="bankName" label="Bank Name" />
              <FormTextField name="accountNumber" label="Account Number" />
              <FormTextField name="ifsc" label="IFSC Code" />
              <FormCheckbox name="isPrimary" label="Set as primary account" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Add Account'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
