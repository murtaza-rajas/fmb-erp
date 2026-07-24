import { useEffect } from 'react';
import { useForm, FormProvider, useFieldArray, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert,
  CircularProgress, Grid, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import FormSelect from '../../../../components/form/FormSelect';
import FormTextField from '../../../../components/form/FormTextField';
import { useReceivablePurchaseOrdersQuery, usePurchaseOrderQuery } from '../../../procurement/purchaseOrders/purchaseOrdersApi';
import { useStoresQuery } from '../../../masters/stores/storesApi';
import { useCreateGrnMutation } from '../grnsApi';
import { optionalNumber } from '../../../../utils/yupHelpers';

const REJECTION_REASON_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
];

const schema = yup.object({
  poId: yup.string().required('Purchase Order is required'),
  storeId: yup.string().required('Store is required'),
  items: yup.array().of(
    yup.object({
      itemId: yup.string().required(),
      receivedQty: optionalNumber().min(0, 'Cannot be negative').required('Received qty is required'),
      rejectedQty: optionalNumber().min(0, 'Cannot be negative'),
      rejectionReason: yup.string().nullable(),
      remarks: yup.string().nullable(),
    })
  ),
});

export default function GrnFormDialog({ open, onClose }) {
  const { data: purchaseOrders = [] } = useReceivablePurchaseOrdersQuery();
  const { data: storesData } = useStoresQuery({ limit: 100 });

  const methods = useForm({ resolver: yupResolver(schema), defaultValues: { poId: '', storeId: '', items: [] } });
  const { fields, replace } = useFieldArray({ control: methods.control, name: 'items' });
  const selectedPoId = useWatch({ control: methods.control, name: 'poId' });
  const { data: selectedPo } = usePurchaseOrderQuery(selectedPoId);

  useEffect(() => {
    if (selectedPo) {
      replace(
        selectedPo.items.map((line) => ({
          itemId: line.itemId?._id || line.itemId,
          receivedQty: line.quantity,
          rejectedQty: 0,
          rejectionReason: '',
          remarks: '',
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPo]);

  const { mutateAsync, isPending, error } = useCreateGrnMutation();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      items: values.items.map((line) => ({ ...line, rejectionReason: line.rejectionReason || undefined })),
    };
    try {
      const result = await mutateAsync(payload);
      enqueueSnackbar(`${result.grn.grnNumber} recorded — PO is now ${result.poStatus.replace(/_/g, ' ')}`, { variant: 'success' });
      methods.reset({ poId: '', storeId: '', items: [] });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const poOptions = purchaseOrders.map((po) => ({ value: po._id, label: `${po.poNumber} — ${po.vendorId?.name || ''}` }));
  const storeOptions = (storesData?.items || []).map((s) => ({ value: s._id, label: s.name }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Goods Receipt Note</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to create GRN'}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormSelect name="poId" label="Purchase Order" options={poOptions} autoFocus />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect name="storeId" label="Receiving Store" options={storeOptions} />
                </Grid>
              </Grid>

              {fields.length > 0 && (
                <>
                  <Typography variant="subtitle2">Items (ordered quantity shown per line)</Typography>
                  {fields.map((field, index) => (
                    <Grid container spacing={1.5} key={field.id} alignItems="center">
                      <Grid item xs={12} sm={2.5}>
                        <Typography variant="body2">
                          {selectedPo?.items[index]?.itemId?.name} <Typography component="span" variant="caption" color="text.secondary">(ord. {selectedPo?.items[index]?.quantity})</Typography>
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <FormTextField name={`items.${index}.receivedQty`} label="Received Qty" type="number" />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <FormTextField name={`items.${index}.rejectedQty`} label="Rejected Qty" type="number" />
                      </Grid>
                      <Grid item xs={6} sm={2.5}>
                        <FormSelect name={`items.${index}.rejectionReason`} label="Rejection Reason" options={REJECTION_REASON_OPTIONS} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <FormTextField name={`items.${index}.remarks`} label="Remarks" />
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
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Record GRN'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
