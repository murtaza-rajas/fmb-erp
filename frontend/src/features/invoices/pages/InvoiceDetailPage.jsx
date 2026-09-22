import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Button, Stack, CircularProgress, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import StatusBadge from '../../../components/StatusBadge';
import ErrorState from '../../../components/ErrorState';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { usePermission } from '../../../hooks/usePermission';
import {
  useInvoiceQuery, useInvoiceMatchHistoryQuery, useMatchInvoiceMutation,
  useHoldInvoiceMutation, useReleaseInvoiceMutation,
} from '../invoicesApi';
import HoldInvoiceDialog from './HoldInvoiceDialog';
import OverrideMatchDialog from './OverrideMatchDialog';
import InvoiceFormDialog from './InvoiceFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError, error, refetch } = useInvoiceQuery(id);
  const { data: history = [] } = useInvoiceMatchHistoryQuery(id);
  const { enqueueSnackbar } = useSnackbar();

  const canMatch = usePermission('invoice:match');
  const canUpdate = usePermission('invoice:update');
  const canHold = usePermission('invoice:hold');
  const canRelease = usePermission('invoice:release');
  const canOverrideMatch = usePermission('invoice:override_match');

  const [holding, setHolding] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [editing, setEditing] = useState(false);

  const { mutateAsync: match, isPending: matching, data: matchResult } = useMatchInvoiceMutation(id);
  const { mutateAsync: release, isPending: releasingRequest } = useReleaseInvoiceMutation(id);

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const handleMatch = async () => {
    const result = await match();
    enqueueSnackbar(result.result === 'matched' ? 'Invoice matched — PO advanced to invoiced' : 'Invoice mismatched — see discrepancies below', {
      variant: result.result === 'matched' ? 'success' : 'warning',
    });
  };

  const handleRelease = async () => {
    await release();
    enqueueSnackbar('Invoice released from hold', { variant: 'success' });
    setReleasing(false);
  };

  const latestDiscrepancies = matchResult?.discrepancies ?? history[0]?.discrepancies ?? [];
  const poGrnPairs = [...new Map(invoice.items.map((line) => [`${line.poId?._id}:${line.grnId?._id}`, line])).values()];
  const poGrnSummary = poGrnPairs.map((line) => `${line.poId?.poNumber || '—'} / ${line.grnId?.grnNumber || '—'}`).join(', ');

  return (
    <Box>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Vendor: ${invoice.vendorId?.name || '—'} · PO/GRN: ${poGrnSummary || '—'}`}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')}>Back</Button>
            {canUpdate && (invoice.matchStatus === 'pending' || invoice.totalAmount === 0) && (
              <Button startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>Edit</Button>
            )}
            {canMatch && (
              <Button variant="contained" startIcon={<CompareArrowsIcon />} onClick={handleMatch} disabled={matching}>
                {matching ? <CircularProgress size={18} color="inherit" /> : 'Run 3-Way Match'}
              </Button>
            )}
            {canHold && invoice.holdStatus !== 'on_hold' && (
              <Button startIcon={<PauseCircleOutlineIcon />} onClick={() => setHolding(true)}>Hold</Button>
            )}
            {canRelease && invoice.holdStatus === 'on_hold' && (
              <Button startIcon={<PlayCircleOutlineIcon />} onClick={() => setReleasing(true)}>Release</Button>
            )}
            {canOverrideMatch && invoice.matchStatus === 'mismatched' && (
              <Button color="warning" startIcon={<RuleOutlinedIcon />} onClick={() => setOverriding(true)}>Override Match</Button>
            )}
          </Stack>
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <StatusBadge status={invoice.matchStatus} />
        <StatusBadge status={invoice.holdStatus} />
      </Stack>

      {invoice.holdStatus === 'on_hold' && invoice.holdReason && (
        <Alert severity="warning" sx={{ mb: 2 }}>On hold: {invoice.holdReason}</Alert>
      )}

      {invoice.matchStatus === 'overridden' && invoice.matchOverrideReason && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Match overridden{invoice.matchOverriddenBy?.name ? ` by ${invoice.matchOverriddenBy.name}` : ''}
          {invoice.matchOverriddenAt ? ` on ${dayjs(invoice.matchOverriddenAt).format('DD MMM YYYY, HH:mm')}` : ''}: {invoice.matchOverrideReason}
        </Alert>
      )}

      {latestDiscrepancies.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Discrepancies found</Typography>
          {latestDiscrepancies.map((d, i) => (
            <Typography key={i} variant="body2">
              {d.field === 'rate' ? `Rate: PO says ${d.poValue}, invoice says ${d.invoiceValue}` : `Quantity: GRN received ${d.grnValue}, invoice says ${d.invoiceValue}`}
            </Typography>
          ))}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Invoice Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    {poGrnPairs.length > 1 && <TableCell>PO / GRN</TableCell>}
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{line.itemId?.name || line.itemId}</TableCell>
                      {poGrnPairs.length > 1 && (
                        <TableCell>{line.poId?.poNumber || '—'} / {line.grnId?.grnNumber || '—'}</TableCell>
                      )}
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{currency(line.rate)}</TableCell>
                      <TableCell align="right">{currency(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Total: {currency(invoice.totalAmount)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Match History</Typography>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Not matched yet</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {history.map((h) => (
                    <Box key={h._id}>
                      <StatusBadge status={h.result} />
                      <Typography variant="caption" color="text.secondary" display="block">
                        {dayjs(h.matchedAt).format('DD MMM YYYY, HH:mm')} {h.matchedBy?.name ? `· ${h.matchedBy.name}` : ''}
                      </Typography>
                      {h.discrepancies.length > 0 && (
                        <Typography variant="caption" color="error.main" display="block">{h.discrepancies.length} discrepanc{h.discrepancies.length === 1 ? 'y' : 'ies'}</Typography>
                      )}
                      {h.reason && (
                        <Typography variant="caption" color="text.secondary" display="block">Reason: {h.reason}</Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <InvoiceFormDialog open={editing} onClose={() => setEditing(false)} invoice={editing ? invoice : undefined} />
      <HoldInvoiceDialog open={holding} onClose={() => setHolding(false)} invoiceId={id} />
      <OverrideMatchDialog open={overriding} onClose={() => setOverriding(false)} invoiceId={id} />
      <ConfirmDialog
        open={releasing}
        onClose={() => setReleasing(false)}
        onConfirm={handleRelease}
        loading={releasingRequest}
        title="Release invoice from hold"
        description="This allows a payment voucher to be raised (if matched) or the invoice to be re-matched."
        confirmLabel="Release"
      />
    </Box>
  );
}
