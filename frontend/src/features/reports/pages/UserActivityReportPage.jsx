import { useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import EmptyState from '../../../components/EmptyState';
import { useUserActivityReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useUsersQuery } from '../../users/usersApi';

export default function UserActivityReportPage() {
  const [filters, setFilters] = useState({ userId: '', from: '', to: '' });
  const { data: rows, isLoading, isError, error, refetch } = useUserActivityReportQuery(filters);
  const { data: usersData } = useUsersQuery({ limit: 200 });
  const users = usersData?.items || [];

  const columns = [
    { key: 'timestamp', header: 'Timestamp', cell: (r) => (r.timestamp ? dayjs(r.timestamp).format('DD MMM YYYY, HH:mm') : '—') },
    { key: 'action', header: 'Action' },
    { key: 'module', header: 'Module' },
    { key: 'entityType', header: 'Entity Type' },
    { key: 'entityId', header: 'Entity ID' },
  ];

  return (
    <Box>
      <PageHeader title="User Activity Report" subtitle="Audit trail for a specific user" />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="User"
              size="small"
              sx={{ minWidth: 220 }}
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            >
              <MenuItem value="">Select a user</MenuItem>
              {users.map((u) => (
                <MenuItem key={u._id} value={u._id}>
                  {u.name}
                </MenuItem>
              ))}
            </TextField>
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
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons endpoint="/reports/user-activity" params={filters} filename="user-activity-report" />
          </Stack>
        </CardContent>
      </Card>

      {!filters.userId ? (
        <EmptyState title="Select a user to view their activity" />
      ) : (
        <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
      )}
    </Box>
  );
}
