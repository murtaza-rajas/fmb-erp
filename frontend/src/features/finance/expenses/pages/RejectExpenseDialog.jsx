import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import { useRejectExpenseMutation } from '../expensesApi';

const schema = yup.object({ reason: yup.string().required('Reason is required') });

export default function RejectExpenseDialog({ open, onClose, expense }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { reason: '' } });
  const { mutateAsync, isPending, error } = useRejectExpenseMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync({ id: expense._id, reason: values.reason });
      enqueueSnackbar('Expense rejected', { variant: 'success' });
      methods.reset({ reason: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reject Expense {expense?.expenseNumber}</DialogTitle>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error.response?.data?.error?.message || 'Failed to reject expense'}</Alert>}
            <FormTextField name="reason" label="Rejection Reason" multiline rows={3} autoFocus />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Reject'}
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
