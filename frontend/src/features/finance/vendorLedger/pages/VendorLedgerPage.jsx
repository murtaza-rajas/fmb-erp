import { useState } from 'react';
import {
  Box, Card, CardContent, TextField, MenuItem, Table, TableHead, TableBody,
  TableRow, TableCell, Typography, Tabs, Tab, CircularProgress,
} from '@mui/material';
import PageHeader from '../../../../components/PageHeader';
import EmptyState from '../../../../components/EmptyState';
import { useAllVendorsQuery } from '../../../masters/vendors/vendorsApi';
import { useVendorLedgerQuery, useOutstandingPaymentsQuery } from '../vendorLedgerApi';
import dayjs from 'dayjs';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

function LedgerTab() {
  const [vendorId, setVendorId] = useState('');
  const { data: vendors = [] } = useAllVendorsQuery();
  const { data, isLoading } = useVendorLedgerQuery(vendorId, { limit: 50 });

  return (
    <Box>
      <TextField select label="Select Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ mb: 2, minWidth: 300 }} size="small">
        {vendors.map((v) => <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>)}
      </TextField>

      {!vendorId ? (
        <EmptyState title="Select a vendor to view their ledger" />
      ) : isLoading ? (
        <CircularProgress size={20} />
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Entry Type</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items || []).map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>{dayjs(entry.timestamp).format('DD MMM YYYY, HH:mm')}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{entry.entryType.replace(/_/g, ' ')}</TableCell>
                    <TableCell align="right">{entry.debit > 0 ? currency(entry.debit) : '—'}</TableCell>
                    <TableCell align="right">{entry.credit > 0 ? currency(entry.credit) : '—'}</TableCell>
                    <TableCell align="right">{currency(entry.balanceAfter)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(data?.items || []).length === 0 && <EmptyState title="No ledger activity for this vendor yet" />}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function OutstandingTab() {
  const { data: outstanding = [], isLoading } = useOutstandingPaymentsQuery();

  if (isLoading) return <CircularProgress size={20} />;
  if (outstanding.length === 0) return <EmptyState title="No outstanding vendor balances" />;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vendor</TableCell>
              <TableCell align="right">Outstanding Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {outstanding.map((row) => (
              <TableRow key={row.vendor._id}>
                <TableCell>{row.vendor.name}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600} color="warning.main">{currency(row.outstandingBalance)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function VendorLedgerPage() {
  const [tab, setTab] = useState('ledger');

  return (
    <Box>
      <PageHeader title="Vendor Ledger" subtitle="Payable balance history per vendor" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Ledger" value="ledger" />
        <Tab label="Outstanding Payments" value="outstanding" />
      </Tabs>
      {tab === 'ledger' ? <LedgerTab /> : <OutstandingTab />}
    </Box>
  );
}
