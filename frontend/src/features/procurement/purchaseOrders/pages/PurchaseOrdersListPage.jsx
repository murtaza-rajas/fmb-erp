import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import StatusBadge from '../../../../components/StatusBadge';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { usePurchaseOrdersQuery } from '../purchaseOrdersApi';
import PurchaseOrderFormDialog from './PurchaseOrderFormDialog';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function PurchaseOrdersListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = usePurchaseOrdersQuery(queryParams);
  const canCreate = usePermission('po:create');
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const columns = useMemo(
    () => [
      { header: 'PO Number', accessorKey: 'poNumber' },
      { header: 'Vendor', accessorKey: 'vendorId', cell: (info) => info.getValue()?.name || '—' },
      { header: 'Total Amount', accessorKey: 'totalAmount', cell: (info) => currency(info.getValue()) },
      { header: 'Status', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue()} /> },
      { header: 'Revision', accessorKey: 'revisionNumber', cell: (info) => (info.getValue() > 0 ? `Rev ${info.getValue()}` : '—') },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => navigate(`/procurement/purchase-orders/${info.row.original._id}`)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [navigate]
  );

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        subtitle="Orders issued to vendors"
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Purchase Order</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No purchase orders found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <PurchaseOrderFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
