import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableBody, TableRow, TableCell, Stack, Typography, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import { useMaterialIssueVoucherQuery } from '../materialIssueVouchersApi';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CATEGORY_LABELS = { fmb: 'FMB', safar_thaali: 'Safar Thaali', event: 'Event' };

export default function MaterialIssueVoucherDetailDialog({ open, onClose, voucherId }) {
  const { data: voucher, isLoading } = useMaterialIssueVoucherQuery(voucherId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{voucher?.voucherNumber || 'Material Issue Voucher'}</DialogTitle>
      <DialogContent>
        {isLoading || !voucher ? (
          <CircularProgress size={24} />
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
              <Stack>
                <Typography variant="caption" color="text.secondary">Store</Typography>
                <Typography variant="body2">{voucher.storeId?.name || '—'}</Typography>
              </Stack>
              <Stack>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="body2">{CATEGORY_LABELS[voucher.category] || voucher.category}</Typography>
              </Stack>
              <Stack>
                <Typography variant="caption" color="text.secondary">Thaali Count</Typography>
                <Typography variant="body2">{voucher.thaaliCount}</Typography>
              </Stack>
              <Stack>
                <Typography variant="caption" color="text.secondary">Issue Date</Typography>
                <Typography variant="body2">{voucher.issueDate ? dayjs(voucher.issueDate).format('DD MMM YYYY') : '—'}</Typography>
              </Stack>
              <Stack>
                <Typography variant="caption" color="text.secondary">Issued By</Typography>
                <Typography variant="body2">{voucher.issuedBy?.name || '—'}</Typography>
              </Stack>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Line Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {voucher.items.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>{line.itemId?.name || line.itemId}</TableCell>
                    <TableCell align="right">{line.quantity}</TableCell>
                    <TableCell align="right">{currency(line.rate)}</TableCell>
                    <TableCell align="right">{currency(line.lineCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Stack direction="row" justifyContent="flex-end">
              <Typography variant="subtitle1" fontWeight={700}>Total: {currency(voucher.totalCost)}</Typography>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
