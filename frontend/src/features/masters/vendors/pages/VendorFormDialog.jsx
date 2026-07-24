import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress, Grid } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../../components/form/FormTextField';
import FormSelect from '../../../../components/form/FormSelect';
import FormAutocomplete from '../../../../components/form/FormAutocomplete';
import { usePaymentTermsQuery } from '../../paymentTerms/paymentTermsApi';
import { useAllItemsQuery } from '../../items/itemsApi';
import { useCreateVendorMutation, useUpdateVendorMutation } from '../vendorsApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  contactPerson: yup.string().nullable(),
  phone: yup.string().nullable(),
  email: yup.string().email('Enter a valid email').nullable(),
  paymentTermsId: yup.string().nullable(),
  itemsSupplied: yup.array().of(yup.string()),
});

export default function VendorFormDialog({ open, onClose, vendor }) {
  const isEdit = Boolean(vendor);
  const { data: paymentTermsData } = usePaymentTermsQuery({ limit: 100 });
  const { data: items = [] } = useAllItemsQuery();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', contactPerson: '', phone: '', email: '', paymentTermsId: '', itemsSupplied: [] },
  });

  useEffect(() => {
    if (open) {
      methods.reset(
        isEdit
          ? {
              name: vendor.name,
              contactPerson: vendor.contactPerson || '',
              phone: vendor.phone || '',
              email: vendor.email || '',
              paymentTermsId: vendor.paymentTermsId?._id || vendor.paymentTermsId || '',
              itemsSupplied: (vendor.itemsSupplied || []).map((i) => i._id || i),
            }
          : { name: '', contactPerson: '', phone: '', email: '', paymentTermsId: '', itemsSupplied: [] }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendor]);

  const { mutateAsync: createVendor, isPending: creating, error: createError } = useCreateVendorMutation();
  const { mutateAsync: updateVendor, isPending: updating, error: updateError } = useUpdateVendorMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    const payload = { ...values, paymentTermsId: values.paymentTermsId || undefined };
    try {
      if (isEdit) {
        await updateVendor({ id: vendor._id, ...payload });
        enqueueSnackbar('Vendor updated', { variant: 'success' });
      } else {
        await createVendor(payload);
        enqueueSnackbar('Vendor created', { variant: 'success' });
      }
      onClose();
    } catch {
      // surfaced via error state below
    }
  };

  const error = createError || updateError;
  const paymentTermOptions = [{ value: '', label: 'None' }, ...(paymentTermsData?.items || []).map((t) => ({ value: t._id, label: t.name }))];
  const itemOptions = items.map((i) => ({ value: i._id, label: i.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Grid container spacing={2.5}>
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error.response?.data?.error?.message || 'Failed to save vendor'}</Alert>
                </Grid>
              )}
              <Grid item xs={12} sm={6}><FormTextField name="name" label="Vendor Name" autoFocus /></Grid>
              <Grid item xs={12} sm={6}><FormTextField name="contactPerson" label="Contact Person" /></Grid>
              <Grid item xs={12} sm={6}><FormTextField name="phone" label="Phone" /></Grid>
              <Grid item xs={12} sm={6}><FormTextField name="email" label="Email" /></Grid>
              <Grid item xs={12}><FormSelect name="paymentTermsId" label="Payment Terms" options={paymentTermOptions} /></Grid>
              <Grid item xs={12}><FormAutocomplete name="itemsSupplied" label="Items Supplied" options={itemOptions} multiple /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={creating || updating}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating || updating}>
              {creating || updating ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
