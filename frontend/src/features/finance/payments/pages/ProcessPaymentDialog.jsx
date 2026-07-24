import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import { usePaymentVouchersQuery } from '../../paymentVouchers/paymentVouchersApi';
import { useProcessPaymentMutation } from '../paymentsApi';

const schema = yup.object({
  voucherId: yup.string().required('Voucher is required'),
  transactionRef: yup.string().nullable(),
});

export default function ProcessPaymentDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { voucherId: '', transactionRef: '' } });
  const { data: vouchersData } = usePaymentVouchersQuery({ limit: 100, filter: { approvalStatus: 'approved' } });
  const { mutateAsync, isPending, error } = useProcessPaymentMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Payment processed — PO closed, advice emailed to vendor', { variant: 'success' });
      methods.reset({ voucherId: '', transactionRef: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const voucherOptions = (vouchersData?.items || []).map((v) => ({ value: v._id, label: `${v.voucherNumber} — ${v.vendorId?.name || ''} (${v.amount})` }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Process Payment</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to process payment'}</Alert>}
              <FormSelect name="voucherId" label="Approved Voucher" options={voucherOptions} autoFocus />
              <FormTextField name="transactionRef" label="Transaction Reference (optional)" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Process Payment'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
