import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import FormAutocomplete from '../../../../components/form/FormAutocomplete';
import { useAllItemsQuery } from '../../items/itemsApi';
import { useAddVendorItemRateMutation } from '../vendorsApi';

const schema = yup.object({
  itemId: yup.string().required('Item is required'),
  rate: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Rate is required'),
  quotationRef: yup.string().nullable(),
});

export default function AddItemRateDialog({ open, onClose, vendorId }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { itemId: '', rate: '', quotationRef: '' } });
  const { data: items = [] } = useAllItemsQuery();
  const { mutateAsync, isPending, error } = useAddVendorItemRateMutation(vendorId);
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Rate added', { variant: 'success' });
      methods.reset();
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const itemOptions = items.map((i) => ({ value: i._id, label: i.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Item Rate</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to add rate'}</Alert>}
              <FormAutocomplete name="itemId" label="Item" options={itemOptions} />
              <FormTextField name="rate" label="Rate" type="number" />
              <FormTextField name="quotationRef" label="Quotation Reference (optional)" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Add Rate'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
