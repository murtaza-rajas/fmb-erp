import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import { useAllVendorsQuery } from '../../../masters/vendors/vendorsApi';
import { useCreateAdvancePaymentMutation } from '../advancePaymentsApi';

const schema = yup.object({
  vendorId: yup.string().required('Vendor is required'),
  amount: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Amount is required'),
});

export default function AdvancePaymentFormDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { vendorId: '', amount: '' } });
  const { data: vendors = [] } = useAllVendorsQuery();
  const { mutateAsync, isPending, error } = useCreateAdvancePaymentMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Advance payment recorded', { variant: 'success' });
      methods.reset({ vendorId: '', amount: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Advance Payment</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to record advance'}</Alert>}
              <FormSelect name="vendorId" label="Vendor" options={vendorOptions} autoFocus />
              <FormTextField name="amount" label="Amount" type="number" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Record Advance'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
