import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import { useAllVendorsQuery } from '../../../masters/vendors/vendorsApi';
import { useCreateCreditNoteMutation } from '../creditNotesApi';

const schema = yup.object({
  vendorId: yup.string().required('Vendor is required'),
  amount: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Amount is required'),
  reason: yup.string().required('Reason is required'),
});

export default function CreditNoteFormDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { vendorId: '', amount: '', reason: '' } });
  const { data: vendors = [] } = useAllVendorsQuery();
  const { mutateAsync, isPending, error } = useCreateCreditNoteMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      const cn = await mutateAsync(values);
      enqueueSnackbar(`${cn.cnNumber} created`, { variant: 'success' });
      methods.reset({ vendorId: '', amount: '', reason: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Credit Note</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create credit note'}</Alert>}
              <FormSelect name="vendorId" label="Vendor" options={vendorOptions} autoFocus />
              <FormTextField name="amount" label="Amount" type="number" />
              <FormTextField name="reason" label="Reason" multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Credit Note'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
