import { useForm, FormProvider, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert,
  CircularProgress, Grid, IconButton, Typography, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import FormSelect from '../../../../components/form/FormSelect';
import FormAutocomplete from '../../../../components/form/FormAutocomplete';
import FormDatePicker from '../../../../components/form/FormDatePicker';
import FormCheckbox from '../../../../components/form/FormCheckbox';
import { useStoresQuery } from '../../../masters/stores/storesApi';
import { useAllItemsQuery } from '../../../masters/items/itemsApi';
import { useCreateRequisitionMutation } from '../requisitionsApi';

const schema = yup.object({
  storeId: yup.string().required('Store is required'),
  isEmergency: yup.boolean(),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required('Item is required'),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
      neededByDate: yup.string().required('Needed-by date is required'),
      reason: yup.string().nullable(),
    })
  ).min(1, 'At least one item is required'),
});

function RequisitionItemRow({ index, itemOptions, unitByItemId, onRemove, disableRemove }) {
  const { control } = useFormContext();
  const itemId = useWatch({ control, name: `items.${index}.itemId` });
  const unitSymbol = unitByItemId[itemId];

  return (
    <Grid container spacing={1.5} alignItems="flex-start">
      <Grid item xs={12} sm={4}>
        <FormAutocomplete name={`items.${index}.itemId`} label="Item" options={itemOptions} />
      </Grid>
      <Grid item xs={6} sm={2}>
        <FormTextField
          name={`items.${index}.quantity`}
          label="Quantity"
          type="number"
          InputProps={unitSymbol ? { endAdornment: <InputAdornment position="end">{unitSymbol}</InputAdornment> } : undefined}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <FormDatePicker name={`items.${index}.neededByDate`} label="Needed By" />
      </Grid>
      <Grid item xs={10} sm={2.5}>
        <FormTextField name={`items.${index}.reason`} label="Reason" />
      </Grid>
      <Grid item xs={2} sm={0.5}>
        <IconButton onClick={onRemove} disabled={disableRemove}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Grid>
    </Grid>
  );
}

export default function RequisitionFormDialog({ open, onClose }) {
  const { data: storesData } = useStoresQuery({ limit: 100 });
  const { data: items = [] } = useAllItemsQuery();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { storeId: '', isEmergency: false, items: [{ itemId: '', quantity: '', neededByDate: null, reason: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'items' });

  const { mutateAsync, isPending, error } = useCreateRequisitionMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values);
      enqueueSnackbar('Requisition created', { variant: 'success' });
      methods.reset({ storeId: '', isEmergency: false, items: [{ itemId: '', quantity: '', neededByDate: null, reason: '' }] });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const storeOptions = (storesData?.items || []).map((s) => ({ value: s._id, label: s.name }));
  const itemOptions = items.map((i) => ({ value: i._id, label: `${i.name} — ${i.unitId?.symbol || 'no unit'}` }));
  const unitByItemId = Object.fromEntries(items.map((i) => [i._id, i.unitId?.symbol]));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Purchase Requisition</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create requisition'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <FormSelect name="storeId" label="Store" options={storeOptions} autoFocus />
                </Grid>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormCheckbox name="isEmergency" label="Emergency purchase" />
                </Grid>
              </Grid>

              <Typography variant="subtitle2">Items</Typography>
              {fields.map((field, index) => (
                <RequisitionItemRow
                  key={field.id}
                  index={index}
                  itemOptions={itemOptions}
                  unitByItemId={unitByItemId}
                  onRemove={() => remove(index)}
                  disableRemove={fields.length === 1}
                />
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => append({ itemId: '', quantity: '', neededByDate: null, reason: '' })}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Item
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Requisition'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
