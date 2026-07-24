import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import FormSelect from '../../../../components/form/FormSelect';
import { useCategoriesQuery } from '../../categories/categoriesApi';
import { useUnitsQuery } from '../../units/unitsApi';
import { useTaxesQuery } from '../../taxes/taxesApi';
import { useCreateItemMutation, useUpdateItemMutation } from '../itemsApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  sku: yup.string().nullable(),
  categoryId: yup.string().required('Category is required'),
  unitId: yup.string().required('Unit is required'),
  reorderLevel: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Reorder level is required'),
  standardRate: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Standard rate is required'),
  taxId: yup.string().nullable(),
});

export default function ItemFormDialog({ open, onClose, item }) {
  const isEdit = Boolean(item);
  const { data: categoriesData } = useCategoriesQuery({ limit: 100 });
  const { data: unitsData } = useUnitsQuery({ limit: 100 });
  const { data: taxesData } = useTaxesQuery({ limit: 100 });

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', sku: '', categoryId: '', unitId: '', reorderLevel: '', standardRate: '', taxId: '' },
  });

  useEffect(() => {
    if (open) {
      methods.reset(
        isEdit
          ? {
              name: item.name,
              sku: item.sku,
              categoryId: item.categoryId?._id || item.categoryId,
              unitId: item.unitId?._id || item.unitId,
              reorderLevel: item.reorderLevel,
              standardRate: item.standardRate,
              taxId: item.taxId?._id || item.taxId || '',
            }
          : { name: '', sku: '', categoryId: '', unitId: '', reorderLevel: '', standardRate: '', taxId: '' }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const { mutateAsync: createItem, isPending: creating, error: createError } = useCreateItemMutation();
  const { mutateAsync: updateItem, isPending: updating, error: updateError } = useUpdateItemMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    const payload = { ...values, sku: values.sku || undefined, taxId: values.taxId || undefined };
    try {
      if (isEdit) {
        await updateItem({ id: item._id, ...payload });
        enqueueSnackbar('Item updated', { variant: 'success' });
      } else {
        await createItem(payload);
        enqueueSnackbar('Item created', { variant: 'success' });
      }
      onClose();
    } catch {
      // surfaced via error state below
    }
  };

  const error = createError || updateError;
  const categoryOptions = (categoriesData?.items || []).map((c) => ({ value: c._id, label: c.name }));
  const unitOptions = (unitsData?.items || []).map((u) => ({ value: u._id, label: `${u.name} (${u.symbol})` }));
  const taxOptions = [{ value: '', label: 'None' }, ...(taxesData?.items || []).map((t) => ({ value: t._id, label: `${t.name} (${t.rate}%)` }))];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Item' : 'New Item'}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to save item'}</Alert>}
              <FormTextField name="name" label="Item Name" autoFocus />
              <FormTextField name="sku" label="SKU (leave blank to auto-generate)" />
              <FormSelect name="categoryId" label="Category" options={categoryOptions} />
              <FormSelect name="unitId" label="Unit" options={unitOptions} />
              <FormTextField name="reorderLevel" label="Reorder Level" type="number" />
              <FormTextField name="standardRate" label="Standard Rate" type="number" />
              <FormSelect name="taxId" label="Tax" options={taxOptions} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={creating || updating}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating || updating}>
              {creating || updating ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Item'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
