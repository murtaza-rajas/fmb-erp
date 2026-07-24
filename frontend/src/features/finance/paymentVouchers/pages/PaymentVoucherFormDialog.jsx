import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import { useInvoicesQuery } from '../../../invoices/invoicesApi';
import { useCreatePaymentVoucherMutation } from '../paymentVouchersApi';
import { optionalNumber } from '../../../../utils/yupHelpers';

const PAYMENT_MODE_OPTIONS = [
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

const schema = yup.object({
  invoiceId: yup.string().required('Invoice is required'),
  amount: optionalNumber().moreThan(0, 'Must be greater than 0'),
  paymentMode: yup.string().required('Payment mode is required'),
});

export default function PaymentVoucherFormDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { invoiceId: '', amount: '', paymentMode: '' } });
  // Only matched, un-held invoices can actually have a voucher raised — the
  // backend enforces this too, but filtering here avoids a predictable 409.
  const { data: invoicesData } = useInvoicesQuery({ limit: 100, filter: { matchStatus: 'matched' } });
  const { mutateAsync, isPending, error } = useCreatePaymentVoucherMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    const payload = { ...values, amount: values.amount || undefined };
    try {
      const voucher = await mutateAsync(payload);
      enqueueSnackbar(`${voucher.voucherNumber} raised — awaiting approval`, { variant: 'success' });
      methods.reset({ invoiceId: '', amount: '', paymentMode: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const invoiceOptions = (invoicesData?.items || [])
    .filter((inv) => inv.holdStatus !== 'on_hold')
    .map((inv) => ({ value: inv._id, label: `${inv.invoiceNumber} — ${inv.vendorId?.name || ''} (${inv.totalAmount})` }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Payment Voucher</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to raise voucher'}</Alert>}
              <FormSelect name="invoiceId" label="Matched Invoice" options={invoiceOptions} autoFocus />
              <FormTextField name="amount" label="Amount (defaults to remaining invoice balance)" type="number" />
              <FormSelect name="paymentMode" label="Payment Mode" options={PAYMENT_MODE_OPTIONS} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Raise Voucher'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
