import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Button, Stack, CircularProgress, Stepper, Step, StepLabel, Menu, MenuItem, ListItemIcon, ListItemText, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import PageHeader from '../../../../components/PageHeader';
import StatusBadge from '../../../../components/StatusBadge';
import ErrorState from '../../../../components/ErrorState';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import {
  usePurchaseOrderQuery, usePoTimelineQuery, useIssuePurchaseOrderMutation,
  useCancelPurchaseOrderMutation, useSendPoEmailMutation, downloadPoPdf,
} from '../purchaseOrdersApi';
import ReviseDialog from './ReviseDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

const PO_LIFECYCLE = ['draft', 'issued', 'partially_received', 'received', 'invoiced', 'payment_pending', 'paid', 'closed'];

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: po, isLoading, isError, error, refetch } = usePurchaseOrderQuery(id);
  const { data: timeline = [] } = usePoTimelineQuery(id);
  const { enqueueSnackbar } = useSnackbar();

  const canUpdate = usePermission('po:update');
  const canRevise = usePermission('po:revise');
  const canCancel = usePermission('po:cancel');
  const canEmail = usePermission('po:email');

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [revising, setRevising] = useState(false);

  const { mutateAsync: issuePo, isPending: issuing } = useIssuePurchaseOrderMutation(id);
  const { mutateAsync: cancelPo, isPending: cancellingRequest } = useCancelPurchaseOrderMutation(id);
  const { mutateAsync: sendEmail, isPending: sendingEmail } = useSendPoEmailMutation(id);

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const handleIssue = async () => {
    await issuePo();
    enqueueSnackbar('Purchase Order issued', { variant: 'success' });
  };

  const handleCancel = async () => {
    await cancelPo('Cancelled from UI');
    enqueueSnackbar('Purchase Order cancelled', { variant: 'success' });
    setCancelling(false);
  };

  const handleSendEmail = async () => {
    try {
      await sendEmail();
      enqueueSnackbar('PO emailed to vendor', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error?.message || 'Failed to send email', { variant: 'error' });
    }
    setMenuAnchor(null);
  };

  const handlePrint = async () => {
    await downloadPoPdf(po._id, po.poNumber);
    setMenuAnchor(null);
  };

  const canIssue = canUpdate && po.status === 'draft';
  const canCancelNow = canCancel && ['draft', 'issued'].includes(po.status);
  const canReviseNow = canRevise && ['draft', 'issued'].includes(po.status);
  const activeStep = po.status === 'cancelled' ? -1 : PO_LIFECYCLE.indexOf(po.status);

  return (
    <Box>
      <PageHeader
        title={po.poNumber}
        subtitle={`Vendor: ${po.vendorId?.name || '—'}${po.revisionNumber > 0 ? ` · Revision ${po.revisionNumber}` : ''}`}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/procurement/purchase-orders')}>Back</Button>
            {canIssue && (
              <Button variant="contained" startIcon={<CheckCircleOutlineIcon />} onClick={handleIssue} disabled={issuing}>
                {issuing ? <CircularProgress size={18} color="inherit" /> : 'Issue PO'}
              </Button>
            )}
            {canReviseNow && (
              <Button startIcon={<EditNoteOutlinedIcon />} onClick={() => setRevising(true)}>Revise</Button>
            )}
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Stack>
        }
      />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handlePrint}>
          <ListItemIcon><PrintOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        {canEmail && po.status !== 'draft' && (
          <MenuItem onClick={handleSendEmail} disabled={sendingEmail}>
            <ListItemIcon><EmailOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{po.emailSentAt ? 'Re-send Email' : 'Email to Vendor'}</ListItemText>
          </MenuItem>
        )}
        {canCancelNow && (
          <MenuItem onClick={() => { setCancelling(true); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><CancelOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Cancel PO</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {po.status !== 'cancelled' ? (
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, overflowX: 'auto' }}>
          {PO_LIFECYCLE.map((s) => (
            <Step key={s}><StepLabel>{s.replace(/_/g, ' ')}</StepLabel></Step>
          ))}
        </Stepper>
      ) : (
        <Box sx={{ mb: 3 }}><StatusBadge status="cancelled" /></Box>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {po.items.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{line.itemId?.name || line.itemId}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{currency(line.rate)}</TableCell>
                      <TableCell align="right">{currency(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Total: {currency(po.totalAmount)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Timeline</Typography>
              <Stack spacing={1.5}>
                {timeline.map((event) => (
                  <Box key={event._id}>
                    <Typography variant="body2">
                      {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `Created (${event.toStatus})`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(event.timestamp).format('DD MMM YYYY, HH:mm')} {event.changedBy?.name ? `· ${event.changedBy.name}` : ''}
                    </Typography>
                    {event.remarks && <Typography variant="caption" color="text.secondary" display="block">{event.remarks}</Typography>}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ReviseDialog open={revising} onClose={() => setRevising(false)} po={po} />
      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={handleCancel}
        loading={cancellingRequest}
        title="Cancel Purchase Order"
        description="This cannot be undone."
        confirmLabel="Cancel PO"
        confirmColor="error"
      />
    </Box>
  );
}
