import { useEffect, useState } from 'react';
import { useForm, FormProvider, useFieldArray, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert,
  CircularProgress, Grid, Typography, InputAdornment,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import FormTextField from '../../../../components/form/FormTextField';
import FormSelect from '../../../../components/form/FormSelect';
import FormAutocomplete from '../../../../components/form/FormAutocomplete';
import { useOpenRequisitionsQuery, useRequisitionQuery } from '../../requisitions/requisitionsApi';
import { useAllVendorsQuery } from '../../../masters/vendors/vendorsApi';
import VendorFormDialog from '../../../masters/vendors/pages/VendorFormDialog';
import { useCreatePurchaseOrderMutation } from '../purchaseOrdersApi';
import { optionalNumber } from '../../../../utils/yupHelpers';
import { usePermission } from '../../../../hooks/usePermission';

const schema = yup.object({
  prnId: yup.string().required('Requisition is required'),
  vendorId: yup.string().required('Vendor is required'),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required('Item is required'),
      quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
      rate: optionalNumber().min(0, 'Cannot be negative'),
    })
  ).min(1, 'At least one item is required'),
});

export default function PurchaseOrderFormDialog({ open, onClose }) {
  const { data: requisitions = [] } = useOpenRequisitionsQuery();
  const { data: vendors = [] } = useAllVendorsQuery();
  const canCreateVendor = usePermission('master:create');
  const [addingVendor, setAddingVendor] = useState(false);

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { prnId: '', vendorId: '', items: [] },
  });
  const { fields, replace } = useFieldArray({ control: methods.control, name: 'items' });
  const selectedPrnId = useWatch({ control: methods.control, name: 'prnId' });
  const { data: selectedPrn } = useRequisitionQuery(selectedPrnId);

  // Pre-populate the line items from the selected PRN's items — Procurement
  // Head can still adjust quantity/rate before issuing.
  useEffect(() => {
    if (selectedPrn) {
      replace(selectedPrn.items.map((line) => ({ itemId: line.itemId?._id || line.itemId, quantity: line.quantity, rate: '' })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrn]);

  const { mutateAsync, isPending, error } = useCreatePurchaseOrderMutation();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      items: values.items.map((line) => ({ ...line, rate: line.rate === '' ? undefined : line.rate })),
    };
    try {
      const po = await mutateAsync(payload);
      enqueueSnackbar(`${po.poNumber} created as draft`, { variant: 'success' });
      methods.reset({ prnId: '', vendorId: '', items: [] });
      onClose();
      navigate(`/procurement/purchase-orders/${po._id}`);
    } catch {
      // surfaced via error below
    }
  };

  const prnOptions = requisitions.map((p) => ({ value: p._id, label: `${p.prnNumber} — ${p.storeId?.name || ''}` }));
  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Purchase Order</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create purchase order'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormSelect name="prnId" label="Purchase Requisition" options={prnOptions} autoFocus />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormAutocomplete
                    name="vendorId"
                    label="Vendor"
                    options={vendorOptions}
                    onAddNew={canCreateVendor ? () => setAddingVendor(true) : undefined}
                    addNewLabel="+ Add New Vendor"
                  />
                </Grid>
              </Grid>

              {fields.length > 0 && (
                <>
                  <Typography variant="subtitle2">
                    Items <Typography component="span" variant="caption" color="text.secondary">(rate defaults to vendor quote or item standard rate if left blank)</Typography>
                  </Typography>
                  {fields.map((field, index) => {
                    const unitSymbol = selectedPrn?.items[index]?.itemId?.unitId?.symbol;
                    return (
                      <Grid container spacing={1.5} key={field.id} alignItems="center">
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            {selectedPrn?.items[index]?.itemId?.name}
                            {unitSymbol && (
                              <Typography component="span" variant="caption" color="text.secondary"> ({unitSymbol})</Typography>
                            )}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <FormTextField
                            name={`items.${index}.quantity`}
                            label="Quantity"
                            type="number"
                            InputProps={unitSymbol ? { endAdornment: <InputAdornment position="end">{unitSymbol}</InputAdornment> } : undefined}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <FormTextField name={`items.${index}.rate`} label="Rate (optional)" type="number" />
                        </Grid>
                      </Grid>
                    );
                  })}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending || fields.length === 0}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Draft PO'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
      <VendorFormDialog
        open={addingVendor}
        onClose={() => setAddingVendor(false)}
        onCreated={(createdVendor) => methods.setValue('vendorId', createdVendor._id, { shouldValidate: true, shouldDirty: true })}
      />
    </Dialog>
  );
}
