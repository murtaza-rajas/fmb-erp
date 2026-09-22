import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import FormSelect from '../../../../components/form/FormSelect';
import FormDatePicker from '../../../../components/form/FormDatePicker';
import FormFileUpload from '../../../../components/form/FormFileUpload';
import { useCreateExpenseMutation } from '../expensesApi';

const CATEGORY_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'wages', label: 'Wages (weekly-paid labour/cooks)' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

const schema = yup.object({
  category: yup.string().required('Category is required'),
  payeeName: yup.string().required('Payee is required'),
  description: yup.string().nullable(),
  amount: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Amount is required'),
  expenseDate: yup.string().required('Date is required'),
  fileKey: yup.string().nullable(),
});

const defaultValues = {
  category: '',
  payeeName: '',
  description: '',
  amount: '',
  expenseDate: new Date().toISOString(),
  fileKey: '',
};

export default function ExpenseFormDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues });
  const { mutateAsync, isPending, error } = useCreateExpenseMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      const expense = await mutateAsync(values);
      enqueueSnackbar(`Expense ${expense.expenseNumber} submitted — awaiting approval`, { variant: 'success' });
      methods.reset(defaultValues);
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Expense</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to submit expense'}</Alert>}
              <FormSelect name="category" label="Category" options={CATEGORY_OPTIONS} autoFocus />
              <FormTextField name="payeeName" label="Paid To (name)" />
              <FormTextField name="description" label="Description (optional)" multiline rows={2} />
              <FormTextField name="amount" label="Amount" type="number" />
              <FormDatePicker name="expenseDate" label="Expense Date" disableFuture />
              <FormFileUpload name="fileKey" label="Receipt / Bill (optional)" module="expense" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Submit Expense'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
