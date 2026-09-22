import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Typography, Tabs, Tab, List, ListItem, ListItemText,
  IconButton, Button, Chip, CircularProgress, Stack, Link,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import EmptyState from '../../../../components/EmptyState';
import ErrorState from '../../../../components/ErrorState';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { usePermission } from '../../../../hooks/usePermission';
import axiosClient from '../../../../services/axiosClient';
import {
  useVendorQuery, useVendorBankAccountsQuery, useRemoveVendorBankAccountMutation, useVendorItemRatesQuery,
} from '../vendorsApi';
import AddBankAccountDialog from './AddBankAccountDialog';
import AddItemRateDialog from './AddItemRateDialog';

async function viewCertificate(fileKey) {
  const { data } = await axiosClient.get('/uploads/view-url', { params: { fileKey } });
  window.open(data.data.viewUrl, '_blank', 'noopener,noreferrer');
}

function OverviewTab({ vendor }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Contact Person</Typography><Typography>{vendor.contactPerson || '—'}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Phone</Typography><Typography>{vendor.phone || '—'}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Email</Typography><Typography>{vendor.email || '—'}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Payment Terms</Typography><Typography>{vendor.paymentTermsId?.name || '—'}</Typography></Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">GST No.</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography>{vendor.gstNumber || '—'}</Typography>
              {vendor.gstCertificateFileKey && (
                <Link component="button" type="button" variant="body2" onClick={() => viewCertificate(vendor.gstCertificateFileKey)}>
                  View Certificate
                </Link>
              )}
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">FSSAI No.</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography>{vendor.fssaiNumber || '—'}</Typography>
              {vendor.fssaiCertificateFileKey && (
                <Link component="button" type="button" variant="body2" onClick={() => viewCertificate(vendor.fssaiCertificateFileKey)}>
                  View Certificate
                </Link>
              )}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Items Supplied</Typography>
            {(vendor.itemsSupplied || []).length === 0 ? (
              <Typography>—</Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {vendor.itemsSupplied.map((item) => (
                  <Chip key={item._id} label={item.name} size="small" />
                ))}
              </Stack>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function BankAccountsTab({ vendorId, canUpdate }) {
  const { data: accounts = [], isLoading } = useVendorBankAccountsQuery(vendorId);
  const { mutateAsync: remove } = useRemoveVendorBankAccountMutation(vendorId);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleDelete = async () => {
    await remove(deleteTarget._id);
    enqueueSnackbar('Bank account removed', { variant: 'success' });
    setDeleteTarget(null);
  };

  if (isLoading) return <CircularProgress size={20} />;

  return (
    <Card variant="outlined">
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        {canUpdate && <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add Bank Account</Button>}
      </Box>
      {accounts.length === 0 ? (
        <EmptyState title="No bank accounts on file" />
      ) : (
        <List disablePadding>
          {accounts.map((a) => (
            <ListItem key={a._id} divider secondaryAction={canUpdate && (
              <IconButton size="small" onClick={() => setDeleteTarget(a)}><DeleteOutlineIcon fontSize="small" color="error" /></IconButton>
            )}>
              <ListItemText
                primary={<>{a.bankName} {a.isPrimary && <Chip label="Primary" size="small" color="primary" sx={{ ml: 1 }} />}</>}
                secondary={`${a.accountHolderName} · A/C ${a.accountNumber} · IFSC ${a.ifsc}`}
              />
            </ListItem>
          ))}
        </List>
      )}
      <AddBankAccountDialog open={adding} onClose={() => setAdding(false)} vendorId={vendorId} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove bank account"
        description="This cannot be undone."
        confirmLabel="Remove"
        confirmColor="error"
      />
    </Card>
  );
}

function ItemRatesTab({ vendorId, canUpdate }) {
  const { data: rates = [], isLoading } = useVendorItemRatesQuery(vendorId);
  const [adding, setAdding] = useState(false);

  if (isLoading) return <CircularProgress size={20} />;

  return (
    <Card variant="outlined">
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        {canUpdate && <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add Rate</Button>}
      </Box>
      {rates.length === 0 ? (
        <EmptyState title="No quotation history" />
      ) : (
        <List disablePadding>
          {rates.map((r) => (
            <ListItem key={r._id} divider>
              <ListItemText
                primary={<>{r.itemId?.name} — {r.rate} {r.effectiveTo === null && <Chip label="Current" size="small" color="success" sx={{ ml: 1 }} />}</>}
                secondary={`Effective from ${new Date(r.effectiveFrom).toLocaleDateString()}${r.effectiveTo ? ` to ${new Date(r.effectiveTo).toLocaleDateString()}` : ''}${r.quotationRef ? ` · Ref: ${r.quotationRef}` : ''}`}
              />
            </ListItem>
          ))}
        </List>
      )}
      <AddItemRateDialog open={adding} onClose={() => setAdding(false)} vendorId={vendorId} />
    </Card>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vendor, isLoading, isError, error, refetch } = useVendorQuery(id);
  const canUpdate = usePermission('master:update');
  const [tab, setTab] = useState('overview');

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title={vendor.name}
        subtitle="Vendor details"
        actions={<Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/masters/vendors')}>Back to Vendors</Button>}
      />
      <Stack spacing={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Overview" value="overview" />
          <Tab label="Bank Accounts" value="bank" />
          <Tab label="Item Rates" value="rates" />
        </Tabs>
        {tab === 'overview' && <OverviewTab vendor={vendor} />}
        {tab === 'bank' && <BankAccountsTab vendorId={id} canUpdate={canUpdate} />}
        {tab === 'rates' && <ItemRatesTab vendorId={id} canUpdate={canUpdate} />}
      </Stack>
    </Box>
  );
}
