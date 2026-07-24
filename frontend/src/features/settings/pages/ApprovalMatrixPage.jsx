import { useState } from 'react';
import { Box, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell, Button, Chip, IconButton, Tooltip, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PageHeader from '../../../components/PageHeader';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import { useApprovalMatrixQuery } from '../settingsApi';
import ApprovalMatrixFormDialog from './ApprovalMatrixFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function ApprovalMatrixPage() {
  const { data: entries, isLoading, isError, error, refetch } = useApprovalMatrixQuery();
  const [dialogEntry, setDialogEntry] = useState(undefined);

  return (
    <Box>
      <PageHeader
        title="Approval Matrix"
        subtitle="Amount thresholds requiring an additional approver role"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogEntry(null)}>
            New Rule
          </Button>
        }
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={24} />
        </Box>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState title="No approval matrix rules configured" />
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Module</TableCell>
                  <TableCell align="right">Amount Threshold</TableCell>
                  <TableCell>Required Approver Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{entry.module.replace(/_/g, ' ')}</TableCell>
                    <TableCell align="right">{currency(entry.amountThreshold)}</TableCell>
                    <TableCell>{entry.requiredApproverRoleId?.name || '—'}</TableCell>
                    <TableCell>
                      {entry.isActive ? <Chip size="small" color="success" label="Active" /> : <Chip size="small" label="Inactive" />}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit rule">
                        <IconButton size="small" onClick={() => setDialogEntry(entry)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ApprovalMatrixFormDialog open={dialogEntry !== undefined} entry={dialogEntry} onClose={() => setDialogEntry(undefined)} />
    </Box>
  );
}
