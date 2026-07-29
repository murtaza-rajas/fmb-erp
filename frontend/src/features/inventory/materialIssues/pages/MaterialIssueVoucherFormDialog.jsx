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
import { useAllItemsQuery } from '../../../masters/items/itemsApi';
import { useStoresQuery } from '../../../masters/stores/storesApi';
import { useCreateMaterialIssueVoucherMutation } from '../materialIssueVouchersApi';

const CATEGORY_OPTIONS = [
  { value: 'fmb', label: 'FMB' },
  { value: 'safar_thaali', label: 'Safar Thaali' },
  { value: 'event', label: 'Event' },
];

const schema = yup.object({
  storeId: yup.string().required('Store is required'),
  category: yup.string().required('Category is required'),
  thaaliCount: yup.number().typeError('Must be a number').min(0, 'Must be 0 or more').required('Thaali count is required'),
  issueDate: yup.string().nullable(),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required('Item is required'),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
    })
  ).min(1, 'At least one item is required'),
});

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function MaterialIssueVoucherFormDialog({ open, onClose }) {
  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { storeId: '', category: '', thaaliCount: '', issueDate: todayIso(), items: [{ itemId: '', quantity: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'items' });
  const { data: items = [] } = useAllItemsQuery();
  const { data: storesData } = useStoresQuery({ limit: 100 });
  const { mutateAsync, isPending, error } = useCreateMaterialIssueVoucherMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Material issue voucher recorded', { variant: 'success' });
      methods.reset({ storeId: '', category: '', thaaliCount: '', issueDate: todayIso(), items: [{ itemId: '', quantity: '' }] });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const itemOptions = items.map((i) => ({ value: i._id, label: `${i.name} (${i.sku})` }));
  const storeOptions = (storesData?.items || []).map((s) => ({ value: s._id, label: s.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Material Issue</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to record material issue'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={6}><FormSelect name="storeId" label="Store" options={storeOptions} autoFocus /></Grid>
                <Grid item xs={6}><FormSelect name="category" label="Category" options={CATEGORY_OPTIONS} /></Grid>
                <Grid item xs={6}><FormTextField name="thaaliCount" label="Thaali Count" type="number" /></Grid>
                <Grid item xs={6}><FormTextField name="issueDate" label="Issue Date" type="date" InputLabelProps={{ shrink: true }} /></Grid>
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
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Record Issue'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
