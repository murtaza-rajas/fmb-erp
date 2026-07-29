import { useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, MenuItem, Typography } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import { useThaaliCostReportQuery } from '../reportsApi';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CATEGORY_OPTIONS = [
  { value: 'fmb', label: 'FMB' },
  { value: 'safar_thaali', label: 'Safar Thaali' },
  { value: 'event', label: 'Event' },
];

export default function ThaaliCostReportPage() {
  const [filters, setFilters] = useState({ from: '', to: '', category: '', groupBy: 'week' });
  const { data: rows, isLoading, isError, error, refetch } = useThaaliCostReportQuery(filters);

  const columns = [
    { key: 'period', header: 'Period' },
    { key: 'category', header: 'Category', cell: (r) => CATEGORY_OPTIONS.find((c) => c.value === r.category)?.label || r.category },
    { key: 'thaaliCount', header: 'Thaali Count' },
    { key: 'totalCost', header: 'Total Cost', align: 'right', cell: (r) => currency(r.totalCost) },
    { key: 'costPerThaali', header: 'Cost / Thaali', align: 'right', cell: (r) => (r.costPerThaali == null ? '—' : currency(r.costPerThaali)) },
    { key: 'budget', header: 'Budget', align: 'right', cell: (r) => (r.budget == null ? '—' : currency(r.budget)) },
    {
      key: 'variance',
      header: 'Variance',
      align: 'right',
      cell: (r) =>
        r.variance == null ? (
          '—'
        ) : (
          <Typography component="span" variant="body2" color={r.variance < 0 ? 'error.main' : 'success.main'} fontWeight={600}>
            {r.variance < 0 ? '-' : '+'}
            {currency(Math.abs(r.variance))}
          </Typography>
        ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Thaali Cost Report" subtitle="Actual cost vs. weekly/monthly budget per thaali category" />
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
              select
              label="Category"
              size="small"
              sx={{ minWidth: 160 }}
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              {CATEGORY_OPTIONS.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Group By"
              size="small"
              sx={{ minWidth: 140 }}
              value={filters.groupBy}
              onChange={(e) => setFilters((f) => ({ ...f, groupBy: e.target.value }))}
            >
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons endpoint="/reports/thaali-cost" params={filters} filename="thaali-cost-report" />
          </Stack>
        </CardContent>
      </Card>

      <ReportTable columns={columns} rows={rows} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </Box>
  );
}
