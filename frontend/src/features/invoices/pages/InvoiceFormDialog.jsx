import { useEffect } from 'react';
import { useForm, FormProvider, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert,
  CircularProgress, Grid, Typography, IconButton, Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import FormTextField from '../../../components/form/FormTextField';
import FormSelect from '../../../components/form/FormSelect';
import FormAutocomplete from '../../../components/form/FormAutocomplete';
import { usePurchaseOrdersQuery, usePurchaseOrderQuery } from '../../procurement/purchaseOrders/purchaseOrdersApi';
import { useGrnsQuery } from '../../inventory/grns/grnsApi';
import { useCreateInvoiceMutation, useUpdateInvoiceMutation } from '../invoicesApi';

const schema = yup.object({
  invoiceNumber: yup.string().required('Invoice number is required'),
  vendorId: yup.string().required('Select a Purchase Order first'),
  poGroups: yup.array().of(
    yup.object({
      poId: yup.string().required('Purchase Order is required'),
      grnId: yup.string().required('GRN is required'),
      items: yup.array().of(
        yup.object({
          itemId: yup.string().required(),
          quantity: yup.number().typeError('Must be a number').moreThan(0, 'Must be greater than 0').required('Quantity is required'),
          rate: yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Rate is required'),
        })
      ),
    })
  ).min(1, 'At least one Purchase Order is required')
    .test('unique-grn', 'The same GRN cannot be added twice on one invoice', (groups) => {
      const grnIds = (groups || []).map((g) => g.grnId).filter(Boolean);
      return new Set(grnIds).size === grnIds.length;
    }),
});

function buildDefaultValues(invoice) {
  if (!invoice) return { invoiceNumber: '', vendorId: '', poGroups: [{ poId: '', grnId: '', items: [] }] };

  const groups = [];
  const indexByKey = new Map();
  for (const line of invoice.items) {
    const poId = line.poId?._id || line.poId;
    const grnId = line.grnId?._id || line.grnId;
    const key = `${poId}:${grnId}`;
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ poId, grnId, items: [] });
    }
    groups[indexByKey.get(key)].items.push({
      itemId: line.itemId?._id || line.itemId,
      quantity: line.quantity,
      rate: line.rate,
    });
  }

  return {
    invoiceNumber: invoice.invoiceNumber,
    vendorId: invoice.vendorId?._id || invoice.vendorId,
    poGroups: groups,
  };
}

// One (PO, GRN) leg of a consolidated invoice — its own item list, pre-filled
// from the selected PO exactly like the original single-PO form did, just
// scoped to this group's field-array path instead of the whole form.
function PoGroupCard({ groupIndex, poOptions, isEdit, onRemove, disableRemove }) {
  const { control, setValue } = useFormContext();
  const selectedPoId = useWatch({ control, name: `poGroups.${groupIndex}.poId` });
  const { data: selectedPo } = usePurchaseOrderQuery(selectedPoId);
  const { data: grnsData } = useGrnsQuery({ limit: 100, filter: selectedPoId ? { poId: selectedPoId } : undefined });
  const { fields, replace } = useFieldArray({ control, name: `poGroups.${groupIndex}.items` });

  // Pre-fills items from the selected PO — only for a brand-new invoice. In
  // edit mode the invoice's own (possibly corrected) items must not be reset
  // back to the PO's original values every time this effect re-runs.
  useEffect(() => {
    if (!isEdit && selectedPo) {
      replace(selectedPo.items.map((line) => ({ itemId: line.itemId?._id || line.itemId, quantity: line.quantity, rate: line.rate })));
      if (groupIndex === 0) setValue('vendorId', selectedPo.vendorId?._id || selectedPo.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPo, isEdit, groupIndex]);

  const grnOptions = (grnsData?.items || []).map((g) => ({ value: g._id, label: g.grnNumber }));

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} sm={5}>
          <FormAutocomplete
            name={`poGroups.${groupIndex}.poId`}
            label="Purchase Order (type PO or vendor name to search)"
            options={poOptions}
            disabled={isEdit}
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <FormSelect name={`poGroups.${groupIndex}.grnId`} label="GRN" options={grnOptions} disabled={isEdit || !selectedPoId} />
        </Grid>
        <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!isEdit && (
            <IconButton onClick={onRemove} disabled={disableRemove}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Grid>
      </Grid>

      {fields.length > 0 && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">
            Items <Typography component="span" variant="caption" color="text.secondary">(pre-filled from PO — edit to reflect what the vendor actually invoiced)</Typography>
          </Typography>
          {fields.map((field, itemIndex) => (
            <Grid container spacing={1.5} key={field.id} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body2">{selectedPo?.items[itemIndex]?.itemId?.name}</Typography>
              </Grid>
              <Grid item xs={3}>
                <FormTextField name={`poGroups.${groupIndex}.items.${itemIndex}.quantity`} label="Quantity" type="number" />
              </Grid>
              <Grid item xs={3}>
                <FormTextField name={`poGroups.${groupIndex}.items.${itemIndex}.rate`} label="Rate" type="number" />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function InvoiceFormDialog({ open, onClose, invoice }) {
  const isEdit = Boolean(invoice);
  const { data: posData } = usePurchaseOrdersQuery({ limit: 100 });

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: buildDefaultValues(),
  });
  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({ control: methods.control, name: 'poGroups' });
  const vendorId = useWatch({ control: methods.control, name: 'vendorId' });

  useEffect(() => {
    if (open) methods.reset(buildDefaultValues(invoice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice]);

  const { mutateAsync: createInvoice, isPending: creating, error: createError } = useCreateInvoiceMutation();
  const { mutateAsync: updateInvoice, isPending: updating, error: updateError } = useUpdateInvoiceMutation();
  const { enqueueSnackbar } = useSnackbar();
  const isPending = creating || updating;
  const error = createError || updateError;

  const onSubmit = async (values) => {
    const items = values.poGroups.flatMap((g) => g.items.map((line) => ({ ...line, poId: g.poId, grnId: g.grnId })));
    try {
      if (isEdit) {
        await updateInvoice({ id: invoice._id, invoiceNumber: values.invoiceNumber, items });
        enqueueSnackbar('Invoice updated', { variant: 'success' });
      } else {
        const created = await createInvoice({ invoiceNumber: values.invoiceNumber, vendorId: values.vendorId, items });
        enqueueSnackbar(`Invoice ${created.invoiceNumber} created — run the three-way match next`, { variant: 'success' });
        methods.reset(buildDefaultValues());
      }
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  const allPoOptions = (posData?.items || []).map((po) => ({
    value: po._id,
    label: `${po.poNumber} — ${po.vendorId?.name || ''}`,
    vendorId: po.vendorId?._id || po.vendorId,
  }));
  const vendorName = allPoOptions.find((o) => o.vendorId === vendorId)?.label?.split(' — ')[1];

  const poGroupsWatched = useWatch({ control: methods.control, name: 'poGroups' });
  const hasItems = poGroupsWatched?.some((g) => g.items?.length > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? `Edit Invoice — ${invoice.invoiceNumber}` : 'New Vendor Invoice'}</DialogTitle>
      <FormProvider {...methods}>
        <Stack component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error.response?.data?.error?.message || 'Failed to save invoice'}</Alert>}
              {isEdit && (
                <Alert severity="info">The PO(s) and GRN(s) this invoice is linked to can't be changed here — only the invoice number and line items.</Alert>
              )}
              {!isEdit && vendorId && (
                <Alert severity="info">
                  Vendor: <strong>{vendorName}</strong> — additional POs on this invoice must belong to the same vendor.
                </Alert>
              )}

              <FormTextField name="invoiceNumber" label="Vendor's Invoice Number" autoFocus />

              <Typography variant="subtitle2">
                Purchase Order{groupFields.length > 1 ? 's' : ''} &amp; GRN{groupFields.length > 1 ? 's' : ''}
                {!isEdit && <Typography component="span" variant="caption" color="text.secondary"> (add another PO for a consolidated invoice)</Typography>}
              </Typography>
              <Stack spacing={2}>
                {groupFields.map((field, groupIndex) => (
                  <PoGroupCard
                    key={field.id}
                    groupIndex={groupIndex}
                    poOptions={groupIndex === 0 ? allPoOptions : allPoOptions.filter((o) => o.vendorId === vendorId)}
                    isEdit={isEdit}
                    onRemove={() => removeGroup(groupIndex)}
                    disableRemove={groupFields.length === 1}
                  />
                ))}
              </Stack>
              {!isEdit && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => appendGroup({ poId: '', grnId: '', items: [] })}
                  disabled={!vendorId}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Another PO
                </Button>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isPending || !hasItems}>
              {isPending ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </DialogActions>
        </Stack>
      </FormProvider>
    </Dialog>
  );
}
