import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, CircularProgress,
  Typography, FormControlLabel, Checkbox, Stack, Box,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useDebitNotesQuery } from '../../../inventory/debitNotes/debitNotesApi';
import { useApprovePaymentVoucherMutation } from '../paymentVouchersApi';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

// Open debit notes tied to the same PO + GRN as this voucher's invoice — e.g.
// damage rejected at GRN time. Finance can waive one here to pay the vendor
// in full despite it (see vendorLedger reversal in paymentVoucher.service.js).
export default function ApproveVoucherDialog({ open, onClose, voucher }) {
  const [waivedIds, setWaivedIds] = useState([]);
  const { mutateAsync, isPending, error } = useApprovePaymentVoucherMutation();
  const { enqueueSnackbar } = useSnackbar();

  const poId = voucher?.invoiceId?.poId;
  const grnId = voucher?.invoiceId?.grnId;

  const { data, isLoading } = useDebitNotesQuery(
    { filter: { poId, grnId, status: 'open' }, limit: 100 },
    { enabled: open && Boolean(poId) && Boolean(grnId) }
  );
  const openDebitNotes = data?.items || [];

  useEffect(() => {
    if (open) setWaivedIds([]);
  }, [open, voucher?._id]);

  const toggle = (id) => {
    setWaivedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

  const handleApprove = async () => {
    try {
      await mutateAsync({ id: voucher._id, waivedDebitNoteIds: waivedIds });
      enqueueSnackbar('Voucher approved', { variant: 'success' });
      onClose();
    } catch {
      // surfaced via error below
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Approve Voucher {voucher?.voucherNumber}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error.response?.data?.error?.message || 'Failed to approve voucher'}</Alert>}
        <Typography variant="body2" sx={{ mb: 2 }}>
          Approve {voucher?.voucherNumber} for {currency(voucher?.amount)}?
        </Typography>

        {isLoading && <CircularProgress size={18} />}

        {openDebitNotes.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Open debit notes against this PO/GRN
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Check a debit note to waive it — the vendor is paid in full for it and the amount is credited back
              on the vendor ledger, instead of being deducted.
            </Typography>
            <Stack spacing={0.5}>
              {openDebitNotes.map((dn) => (
                <FormControlLabel
                  key={dn._id}
                  control={<Checkbox checked={waivedIds.includes(dn._id)} onChange={() => toggle(dn._id)} size="small" />}
                  label={`${dn.dnNumber} — ${currency(dn.totalAmount)}`}
                />
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="contained" color="success" onClick={handleApprove} disabled={isPending}>
          {isPending ? <CircularProgress size={20} color="inherit" /> : 'Approve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
