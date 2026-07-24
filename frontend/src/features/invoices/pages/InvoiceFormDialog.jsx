import { useEffect } from 'react';
import { useForm, FormProvider, useFieldArray, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress, Grid, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import FormSelect from '../../../components/form/FormSelect';
import { useAllVendorsQuery } from '../../masters/vendors/vendorsApi';
import { usePurchaseOrdersQuery, usePurchaseOrderQuery } from '../../procurement/purchaseOrders/purchaseOrdersApi';
import { useGrnsQuery } from '../../inventory/grns/grnsApi';
import { useCreateInvoiceMutation } from '../invoicesApi';

const schema = yup.object({
  invoiceNumber: yup.string().required('Invoice number is required'),
  vendorId: yup.string().required('Vendor is required'),
  poId: yup.string().required('Purchase Order is required'),
  grnId: yup.string().required('GRN is required'),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required(),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
      rate: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Rate is required'),
    })
  ),
});

export default function InvoiceFormDialog({ open, onClose }) {
  const { data: vendors = [] } = useAllVendorsQuery();
  const { data: posData } = usePurchaseOrdersQuery({ limit: 100 });

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { invoiceNumber: '', vendorId: '', poId: '', grnId: '', items: [] },
  });
  const { fields, replace } = useFieldArray({ control: methods.control, name: 'items' });
  const selectedPoId = useWatch({ control: methods.control, name: 'poId' });
  const { data: selectedPo } = usePurchaseOrderQuery(selectedPoId);
  const { data: grnsData } = useGrnsQuery({ limit: 100, filter: selectedPoId ? { poId: selectedPoId } : undefined });

  useEffect(() => {
    if (selectedPo) {
      replace(selectedPo.items.map((line) => ({ itemId: line.itemId?._id || line.itemId, quantity: line.quantity, rate: line.rate })));
      methods.setValue('vendorId', selectedPo.vendorId?._id || selectedPo.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPo]);

  const { mutateAsync, isPending, error } = useCreateInvoiceMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    try {
      const invoice = await mutateAsync(values);
      enqueueSnackbar(`Invoice ${invoice.invoiceNumber} created — run the three-way match next`, { variant: 'success' });
      methods.reset({ invoiceNumber: '', vendorId: '', poId: '', grnId: '', items: [] });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));
  const poOptions = (posData?.items || []).map((po) => ({ value: po._id, label: `${po.poNumber} — ${po.vendorId?.name || ''}` }));
  const grnOptions = (grnsData?.items || []).map((g) => ({ value: g._id, label: g.grnNumber }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Vendor Invoice</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create invoice'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormTextField name="invoiceNumber" label="Vendor's Invoice Number" autoFocus />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormSelect name="poId" label="Purchase Order" options={poOptions} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormSelect name="grnId" label="GRN" options={grnOptions} disabled={!selectedPoId} />
                </Grid>
              </Grid>

              {fields.length > 0 && (
                <>
                  <Typography variant="subtitle2">
                    Items <Typography component="span" variant="caption" color="text.secondary">(pre-filled from PO — edit to reflect what the vendor actually invoiced)</Typography>
                  </Typography>
                  {fields.map((field, index) => (
                    <Grid container spacing={1.5} key={field.id} alignItems="center">
                      <Grid item xs={6}>
                        <Typography variant="body2">{selectedPo?.items[index]?.itemId?.name}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <FormTextField name={`items.${index}.quantity`} label="Quantity" type="number" />
                      </Grid>
                      <Grid item xs={3}>
                        <FormTextField name={`items.${index}.rate`} label="Rate" type="number" />
                      </Grid>
                    </Grid>
                  ))}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending || fields.length === 0}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Invoice'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
