import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress, Grid, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import FormAutocomplete from '../../../../components/form/FormAutocomplete';
import { useAllVendorsQuery } from '../../../masters/vendors/vendorsApi';
import { useAllItemsQuery } from '../../../masters/items/itemsApi';
import { useStoresQuery } from '../../../masters/stores/storesApi';
import { useCreateStockReturnMutation } from '../stockReturnsApi';

const schema = yup.object({
  storeId: yup.string().required('Store is required'),
  vendorId: yup.string().required('Vendor is required'),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required('Item is required'),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
    })
  ).min(1, 'At least one item is required'),
});

export default function StockReturnFormDialog({ open, onClose }) {
  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { storeId: '', vendorId: '', items: [{ itemId: '', quantity: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'items' });
  const { data: vendors = [] } = useAllVendorsQuery();
  const { data: items = [] } = useAllItemsQuery();
  const { data: storesData } = useStoresQuery({ limit: 100 });
  const { mutateAsync, isPending, error } = useCreateStockReturnMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Stock return recorded — debit note generated', { variant: 'success' });
      methods.reset({ storeId: '', vendorId: '', items: [{ itemId: '', quantity: '' }] });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));
  const itemOptions = items.map((i) => ({ value: i._id, label: `${i.name} (${i.sku})` }));
  const storeOptions = (storesData?.items || []).map((s) => ({ value: s._id, label: s.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Stock Return</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to record stock return'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={6}><FormSelect name="storeId" label="Store" options={storeOptions} autoFocus /></Grid>
                <Grid item xs={6}><FormSelect name="vendorId" label="Vendor" options={vendorOptions} /></Grid>
              </Grid>
              {fields.map((field, index) => (
                <Grid container spacing={1.5} key={field.id} alignItems="center">
                  <Grid item xs={7}><FormAutocomplete name={`items.${index}.itemId`} label="Item" options={itemOptions} /></Grid>
                  <Grid item xs={4}><FormTextField name={`items.${index}.quantity`} label="Quantity" type="number" /></Grid>
                  <Grid item xs={1}>
                    <IconButton onClick={() => remove(index)} disabled={fields.length === 1}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => append({ itemId: '', quantity: '' })} sx={{ alignSelf: 'flex-start' }}>Add Item</Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Record Return'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
