import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import { useAllItemsQuery } from '../../../masters/items/itemsApi';
import { useStoresQuery } from '../../../masters/stores/storesApi';
import { useCreateAdjustmentMutation } from '../adjustmentsApi';

const schema = yup.object({
  itemId: yup.string().required('Item is required'),
  storeId: yup.string().required('Store is required'),
  quantity: yup.number().typeError('Must be a number').test('non-zero', 'Quantity cannot be zero', (v) => v !== 0).required('Quantity is required'),
  reason: yup.string().required('Reason is required'),
});

export default function AdjustmentFormDialog({ open, onClose }) {
  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { itemId: '', storeId: '', quantity: '', reason: '' } });
  const { data: items = [] } = useAllItemsQuery();
  const { data: storesData } = useStoresQuery({ limit: 100 });
  const { mutateAsync, isPending, error } = useCreateAdjustmentMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Stock adjustment recorded', { variant: 'success' });
      methods.reset({ itemId: '', storeId: '', quantity: '', reason: '' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const itemOptions = items.map((i) => ({ value: i._id, label: i.name }));
  const storeOptions = (storesData?.items || []).map((s) => ({ value: s._id, label: s.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Stock Adjustment</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to record adjustment'}</Alert>}
              <FormSelect name="itemId" label="Item" options={itemOptions} autoFocus />
              <FormSelect name="storeId" label="Store" options={storeOptions} />
              <FormTextField name="quantity" label="Quantity (+ to add, − to remove)" type="number" />
              <FormTextField name="reason" label="Reason" multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Record Adjustment'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
