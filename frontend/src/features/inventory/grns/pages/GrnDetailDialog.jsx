import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableBody, TableRow, TableCell, Stack, Typography } from '@mui/material';
import StatusBadge from '../../../../components/StatusBadge';

export default function GrnDetailDialog({ open, onClose, grn }) {
  if (!grn) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{grn.grnNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={4}>
            <Stack>
              <Typography variant="caption" color="text.secondary">PO</Typography>
              <Typography variant="body2">{grn.poId?.poNumber}</Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">Store</Typography>
              <Typography variant="body2">{grn.storeId?.name}</Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">Quality Check</Typography>
              <StatusBadge status={grn.qualityCheckStatus} />
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">Carting Charges</Typography>
              <Typography variant="body2">{grn.cartingCharges || 0}</Typography>
            </Stack>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Ordered</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell align="right">Rejected</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grn.items.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>{line.itemId?.name || line.itemId}</TableCell>
                  <TableCell align="right">{line.orderedQty}</TableCell>
                  <TableCell align="right">{line.receivedQty}</TableCell>
                  <TableCell align="right">{line.rejectedQty}</TableCell>
                  <TableCell>{line.rejectionReason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
