import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useMaterialIssueVouchersQuery } from '../materialIssueVouchersApi';
import MaterialIssueVoucherFormDialog from './MaterialIssueVoucherFormDialog';
import MaterialIssueVoucherDetailDialog from './MaterialIssueVoucherDetailDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CATEGORY_LABELS = { fmb: 'FMB', safar_thaali: 'Safar Thaali', event: 'Event' };

export default function MaterialIssueVouchersListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useMaterialIssueVouchersQuery(queryParams);
  const canCreate = usePermission('material_issue:create');
  const [creating, setCreating] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  const columns = useMemo(
    () => [
      { header: 'Voucher Number', accessorKey: 'voucherNumber' },
      { header: 'Store', accessorKey: 'storeId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Category', accessorKey: 'category', cell: (info) => CATEGORY_LABELS[info.getValue()] || info.getValue() },
      { header: 'Thaali Count', accessorKey: 'thaaliCount' },
      { header: 'Total Cost', accessorKey: 'totalCost', cell: (info) => currency(info.getValue()) },
      { header: 'Issue Date', accessorKey: 'issueDate', cell: (info) => (info.getValue() ? new Date(info.getValue()).toLocaleDateString('en-IN') : '—') },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => setViewTarget(info.row.original._id)}>
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
        title="Material Issues"
        subtitle="Material issued from stores for kitchen/event use"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Material Issue</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No material issue vouchers found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <MaterialIssueVoucherFormDialog open={creating} onClose={() => setCreating(false)} />
      <MaterialIssueVoucherDetailDialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} voucherId={viewTarget} />
    </>
  );
}
