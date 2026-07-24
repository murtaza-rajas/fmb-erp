import { useEffect } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert, CircularProgress, Grid, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import FormTextField from '../../../../components/form/FormTextField';
import { useRevisePurchaseOrderMutation } from '../purchaseOrdersApi';

export default function ReviseDialog({ open, onClose, po }) {
  const methods = useForm({ defaultValues: { items: [] } });
  const { fields, replace } = useFieldArray({ control: methods.control, name: 'items' });

  useEffect(() => {
    if (open && po) {
      replace(po.items.map((line) => ({ itemId: line.itemId?._id || line.itemId, quantity: line.quantity, rate: line.rate })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po]);

  const { mutateAsync, isPending, error } = useRevisePurchaseOrderMutation(po?._id);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    try {
      const revised = await mutateAsync(values);
      enqueueSnackbar(`Revised as ${revised.poNumber}`, { variant: 'success' });
      onClose();
      navigate(`/procurement/purchase-orders/${revised._id}`);
    } catch {
      // surfaced via error below
    }
  };

  if (!po) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Revise {po.poNumber}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to revise'}</Alert>}
              <Typography variant="body2" color="text.secondary">
                Creates a new PO with an incremented revision number; the current PO is marked cancelled (superseded).
              </Typography>
              {fields.map((field, index) => (
                <Grid container spacing={1.5} key={field.id} alignItems="center">
                  <Grid item xs={6}>
                    <Typography variant="body2">{po.items[index]?.itemId?.name}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <FormTextField name={`items.${index}.quantity`} label="Quantity" type="number" />
                  </Grid>
                  <Grid item xs={3}>
                    <FormTextField name={`items.${index}.rate`} label="Rate" type="number" />
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : 'Create Revision'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
