import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableBody, TableRow, TableCell, Typography, Stack } from '@mui/material';
import dayjs from 'dayjs';
import StatusBadge from '../../../../components/StatusBadge';

export default function RequisitionDetailDialog({ open, onClose, requisition }) {
  if (!requisition) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{requisition.prnNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={4}>
            <Stack>
              <Typography variant="caption" color="text.secondary">Store</Typography>
              <Typography variant="body2">{requisition.storeId?.name}</Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">Requested By</Typography>
              <Typography variant="body2">{requisition.requestedBy?.name}</Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <StatusBadge status={requisition.status} />
            </Stack>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Needed By</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requisition.items.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>{line.itemId?.name || line.itemId}</TableCell>
                  <TableCell align="right">{line.quantity}</TableCell>
                  <TableCell>{dayjs(line.neededByDate).format('DD MMM YYYY')}</TableCell>
                  <TableCell>{line.reason || '—'}</TableCell>
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
