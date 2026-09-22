import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip, Chip, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import dayjs from 'dayjs';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useGrnsQuery } from '../grnsApi';
import GrnFormDialog from './GrnFormDialog';
import GrnDetailDialog from './GrnDetailDialog';

export default function GrnsListPage() {
  const { queryParams, tableProps } = useTableState();
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const { data, isLoading, isError, error, refetch } = useGrnsQuery({
    ...queryParams,
    filter: { ...(dateFilter.from && { from: dateFilter.from }), ...(dateFilter.to && { to: dateFilter.to }) },
  });
  const canCreate = usePermission('grn:create');

  const [creating, setCreating] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  const columns = useMemo(
    () => [
      { header: 'GRN Number', accessorKey: 'grnNumber' },
      { header: 'Date', accessorKey: 'createdAt', cell: (info) => (info.getValue() ? dayjs(info.getValue()).format('DD MMM YYYY') : '—') },
      {
        header: 'Items',
        accessorKey: 'items',
        cell: (info) => {
          const items = info.getValue() || [];
          const labels = items.map((line) => `${line.itemId?.name || 'Unknown item'} (${line.receivedQty})`);
          if (labels.length <= 1) return labels[0] || '—';
          return (
            <Tooltip title={labels.join(', ')}>
              <Typography variant="body2" component="span" sx={{ cursor: 'default' }}>
                {labels[0]} +{labels.length - 1} more
              </Typography>
            </Tooltip>
          );
        },
      },
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Partial', accessorKey: 'isPartial', cell: (info) => (info.getValue() ? <Chip label="Partial" size="small" color="warning" variant="outlined" /> : '—') },
      { header: 'Received By', accessorKey: 'receivedBy', cell: (info) => info.getValue()?.name || '—' },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <Tooltip title="View">
            <IconButton size="small" onClick={() => setViewTarget(info.row.original)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Record goods received against a Purchase Order"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New GRN</Button>}
      />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="From"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.from}
              onChange={(e) => {
                setDateFilter((f) => ({ ...f, from: e.target.value }));
                tableProps.onPageChange(1);
              }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.to}
              onChange={(e) => {
                setDateFilter((f) => ({ ...f, to: e.target.value }));
                tableProps.onPageChange(1);
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No GRNs found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <GrnFormDialog open={creating} onClose={() => setCreating(false)} />
      <GrnDetailDialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} grn={viewTarget} />
    </>
  );
}
