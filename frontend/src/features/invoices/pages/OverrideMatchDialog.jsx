import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import { useOverrideMatchMutation } from '../invoicesApi';

const schema = yup.object({ reason: yup.string().required('Reason is required') });

export default function OverrideMatchDialog({ open, onClose, invoiceId }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { reason: '' } });
  const { mutateAsync, isPending, error } = useOverrideMatchMutation(invoiceId);
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values.reason);
      enqueueSnackbar('Match override recorded — a payment voucher can now be raised', { variant: 'success' });
      methods.reset({ reason: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Override Match</DialogTitle>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This accepts the quantity/rate discrepancy shown above and allows a payment voucher to be raised for the
              full invoiced amount. The reason is kept on record against this invoice.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error.response?.data?.error?.message || 'Failed to override match'}</Alert>}
            <FormTextField name="reason" label="Reason" multiline rows={3} autoFocus />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Override'}
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
