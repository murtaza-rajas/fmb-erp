import { useEffect, useState } from 'react';
import { useForm, FormProvider, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import dayjs from 'dayjs';
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
import { useStoreStockQuery } from '../../../inventory/stockLedger/stockLedgerApi';
import ItemFormDialog from '../../../masters/items/pages/ItemFormDialog';
import { useCreateRequisitionMutation, useUpdateRequisitionMutation } from '../requisitionsApi';
import { usePermission } from '../../../../hooks/usePermission';

const schema = yup.object({
  storeId: yup.string().required('Store is required'),
  requisitionDate: yup.string().required('Requisition date is required'),
  isEmergency: yup.boolean(),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required('Item is required'),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
      neededByDate: yup.string().required('Needed-by date is required').test(
        'not-before-requisition-date',
        'Needed-by date cannot be before the requisition date',
        function notBeforeRequisitionDate(value) {
          const requisitionDate = this.from?.[this.from.length - 1]?.value?.requisitionDate;
          if (!value || !requisitionDate) return true;
          return new Date(value) >= new Date(requisitionDate);
        }
      ),
      reason: yup.string().nullable(),
    })
  ).min(1, 'At least one item is required'),
});

function buildDefaultValues(requisition) {
  if (!requisition) {
    return { storeId: '', requisitionDate: dayjs().toISOString(), isEmergency: false, items: [{ itemId: '', quantity: '', neededByDate: null, reason: '' }] };
  }
  return {
    storeId: requisition.storeId?._id || requisition.storeId || '',
    requisitionDate: requisition.requisitionDate || dayjs().toISOString(),
    isEmergency: Boolean(requisition.isEmergency),
    items: requisition.items.map((line) => ({
      itemId: line.itemId?._id || line.itemId || '',
      quantity: line.quantity,
      neededByDate: line.neededByDate,
      reason: line.reason || '',
    })),
  };
}

function RequisitionItemRow({ index, itemOptions, unitByItemId, onRemove, disableRemove, onAddNewItem }) {
  const { control } = useFormContext();
  const itemId = useWatch({ control, name: `items.${index}.itemId` });
  const unitSymbol = unitByItemId[itemId];

  return (
    <Grid container spacing={1.5} alignItems="flex-start">
      <Grid item xs={12} sm={4}>
        <FormAutocomplete
          name={`items.${index}.itemId`}
          label="Item"
          options={itemOptions}
          onAddNew={onAddNewItem ? () => onAddNewItem(index) : undefined}
          addNewLabel="+ Add New Item"
        />
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

export default function RequisitionFormDialog({ open, onClose, requisition }) {
  const isEdit = Boolean(requisition);
  const canCreateItem = usePermission('master:create');
  const { data: storesData } = useStoresQuery({ limit: 100 });
  const { data: items = [] } = useAllItemsQuery();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: buildDefaultValues(),
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'items' });
  const [newItemRowIndex, setNewItemRowIndex] = useState(null);
  const storeId = useWatch({ control: methods.control, name: 'storeId' });
  const { data: storeStock = {} } = useStoreStockQuery(storeId);

  useEffect(() => {
    if (open) methods.reset(buildDefaultValues(requisition));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requisition]);

  const { mutateAsync: createRequisition, isPending: creating, error: createError } = useCreateRequisitionMutation();
  const { mutateAsync: updateRequisition, isPending: updating, error: updateError } = useUpdateRequisitionMutation();
  const { enqueueSnackbar } = useSnackbar();
  const isPending = creating || updating;
  const error = createError || updateError;

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateRequisition({ id: requisition._id, ...values });
        enqueueSnackbar('Requisition updated', { variant: 'success' });
      } else {
        await createRequisition(values);
        enqueueSnackbar('Requisition created', { variant: 'success' });
        methods.reset(buildDefaultValues());
      }
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const storeOptions = (storesData?.items || []).map((s) => ({ value: s._id, label: s.name }));
  const itemOptions = items.map((i) => {
    const stock = storeStock[i._id];
    const stockSuffix = stock !== undefined ? ` (Stock: ${stock})` : '';
    return { value: i._id, label: `${i.name} — ${i.unitId?.symbol || 'no unit'}${stockSuffix}` };
  });
  const unitByItemId = Object.fromEntries(items.map((i) => [i._id, i.unitId?.symbol]));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? `Edit Requisition — ${requisition.prnNumber}` : 'New Purchase Requisition'}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to save requisition'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={5}>
                  <FormSelect name="storeId" label="Store" options={storeOptions} autoFocus />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormDatePicker name="requisitionDate" label="Requisition Date" disableFuture />
                </Grid>
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
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
                  onAddNewItem={canCreateItem ? setNewItemRowIndex : undefined}
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
              {isPending ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Requisition'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
      <ItemFormDialog
        open={newItemRowIndex !== null}
        onClose={() => setNewItemRowIndex(null)}
        item={null}
        onCreated={(createdItem) => {
          methods.setValue(`items.${newItemRowIndex}.itemId`, createdItem._id, { shouldValidate: true, shouldDirty: true });
        }}
      />
    </Dialog>
  );
}
