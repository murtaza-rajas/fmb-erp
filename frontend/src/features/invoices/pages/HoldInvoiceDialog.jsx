import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import { useHoldInvoiceMutation } from '../invoicesApi';

const schema = yup.object({ reason: yup.string().required('Reason is required') });

export default function HoldInvoiceDialog({ open, onClose, invoiceId }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { reason: '' } });
  const { mutateAsync, isPending, error } = useHoldInvoiceMutation(invoiceId);
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values.reason);
      enqueueSnackbar('Invoice put on hold', { variant: 'success' });
      methods.reset({ reason: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Hold Invoice</DialogTitle>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error.response?.data?.error?.message || 'Failed to hold invoice'}</Alert>}
            <FormTextField name="reason" label="Reason" multiline rows={3} autoFocus />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Hold'}
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
