import { useForm, FormProvider, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress, Grid, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import FormAutocomplete from '../../../../components/form/FormAutocomplete';
import { useAllVendorsQuery } from '../../../masters/vendors/vendorsApi';
import { useAllItemsQuery } from '../../../masters/items/itemsApi';
import { useCreateDebitNoteMutation } from '../debitNotesApi';

const REASON_OPTIONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'short_supply', label: 'Short Supply' },
  { value: 'other', label: 'Other' },
];

const schema = yup.object({
  vendorId: yup.string().required('Vendor is required'),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required('Item is required'),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
      rate: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Rate is required'),
      reason: yup.string().required('Reason is required'),
    })
  ).min(1, 'At least one item is required'),
});

function ItemRow({ index, itemOptions, remove, disableRemove }) {
  const { control } = useFormContext();
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const rate = useWatch({ control, name: `items.${index}.rate` });
  const amount = (Number(quantity) || 0) * (Number(rate) || 0);

  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid item xs={12} sm={3}><FormAutocomplete name={`items.${index}.itemId`} label="Item" options={itemOptions} /></Grid>
      <Grid item xs={6} sm={2}><FormTextField name={`items.${index}.quantity`} label="Quantity" type="number" /></Grid>
      <Grid item xs={6} sm={2}><FormTextField name={`items.${index}.rate`} label="Rate" type="number" /></Grid>
      <Grid item xs={6} sm={2}><FormSelect name={`items.${index}.reason`} label="Reason" options={REASON_OPTIONS} /></Grid>
      <Grid item xs={5} sm={2}><Typography variant="body2">Amount: {amount.toFixed(2)}</Typography></Grid>
      <Grid item xs={1}><IconButton onClick={() => remove(index)} disabled={disableRemove}><DeleteOutlineIcon fontSize="small" /></IconButton></Grid>
    </Grid>
  );
}

export default function DebitNoteFormDialog({ open, onClose }) {
  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { vendorId: '', items: [{ itemId: '', quantity: '', rate: '', reason: 'damaged' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'items' });
  const { data: vendors = [] } = useAllVendorsQuery();
  const { data: items = [] } = useAllItemsQuery();
  const { mutateAsync, isPending, error } = useCreateDebitNoteMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      items: values.items.map((line) => ({ ...line, amount: Number(line.quantity) * Number(line.rate) })),
    };
    try {
      const dn = await mutateAsync(payload);
      enqueueSnackbar(`${dn.dnNumber} created`, { variant: 'success' });
      methods.reset({ vendorId: '', items: [{ itemId: '', quantity: '', rate: '', reason: 'damaged' }] });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));
  const itemOptions = items.map((i) => ({ value: i._id, label: `${i.name} (${i.sku})` }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Debit Note</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create debit note'}</Alert>}
              <FormSelect name="vendorId" label="Vendor" options={vendorOptions} autoFocus />
              {fields.map((field, index) => (
                <ItemRow key={field.id} index={index} itemOptions={itemOptions} remove={remove} disableRemove={fields.length === 1} />
              ))}
              <Button startIcon={<AddIcon />} onClick={() => append({ itemId: '', quantity: '', rate: '', reason: 'damaged' })} sx={{ alignSelf: 'flex-start' }}>
                Add Item
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Debit Note'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
