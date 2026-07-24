import { useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import { useAuditReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useUsersQuery } from '../../users/usersApi';

export default function AuditReportPage() {
  const [filters, setFilters] = useState({ from: '', to: '', module: '', userId: '' });
  const { data: rows, isLoading, isError, error, refetch } = useAuditReportQuery(filters);
  const { data: usersData } = useUsersQuery({ limit: 200 });
  const users = usersData?.items || [];

  const columns = [
    { key: 'timestamp', header: 'Timestamp', cell: (r) => (r.timestamp ? dayjs(r.timestamp).format('DD MMM YYYY, HH:mm') : '—') },
    { key: 'user', header: 'User', cell: (r) => r.user || '—' },
    { key: 'action', header: 'Action' },
    { key: 'module', header: 'Module' },
    { key: 'entityType', header: 'Entity Type' },
    { key: 'entityId', header: 'Entity ID' },
  ];

  return (
    <Box>
      <PageHeader title="Audit Log Report" subtitle="System-wide audit trail" />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="From"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
            <TextField
              label="Module"
              size="small"
              placeholder="e.g. po, grn, settings"
              value={filters.module}
              onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
            />
            <TextField
              select
              label="User"
              size="small"
              sx={{ minWidth: 200 }}
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {users.map((u) => (
                <MenuItem key={u._id} value={u._id}>
                  {u.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons endpoint="/reports/audit" params={filters} filename="audit-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
