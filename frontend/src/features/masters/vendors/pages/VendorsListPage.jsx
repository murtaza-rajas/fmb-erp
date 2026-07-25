import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../../../../components/PageHeader';
import DataTable from '../../../../components/DataTable';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import ImportExcelDialog from '../../../../components/ImportExcelDialog';
import { usePermission } from '../../../../hooks/usePermission';
import { useTableState } from '../../../../hooks/useTableState';
import { useVendorsQuery, useDeleteVendorMutation, useImportVendorsMutation } from '../vendorsApi';
import VendorFormDialog from './VendorFormDialog';

export default function VendorsListPage() {
  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useVendorsQuery(queryParams);
  const canCreate = usePermission('master:create');
  const canUpdate = usePermission('master:update');
  const canDelete = usePermission('master:delete');
  const navigate = useNavigate();

  const [formTarget, setFormTarget] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const { mutateAsync: deleteVendor, isPending: deleting } = useDeleteVendorMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleDelete = async () => {
    await deleteVendor(deleteTarget._id);
    enqueueSnackbar('Vendor deleted', { variant: 'success' });
    setDeleteTarget(null);
  };

  const columns = useMemo(
    () => [
      { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
      { header: 'Contact Person', accessorKey: 'contactPerson', cell: (info) => info.getValue() || '—' },
      { header: 'Phone', accessorKey: 'phone', cell: (info) => info.getValue() || '—' },
      { header: 'Email', accessorKey: 'email', cell: (info) => info.getValue() || '—' },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <>
            <Tooltip title="View details">
              <IconButton size="small" onClick={() => navigate(`/masters/vendors/${info.row.original._id}`)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canUpdate && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => setFormTarget(info.row.original)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => setDeleteTarget(info.row.original)}>
                  <DeleteOutlineIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ),
      },
    ],
    [canUpdate, canDelete, navigate]
  );

  return (
    <>
      <PageHeader
        title="Vendors"
        subtitle="Vendor master"
        actions={
          canCreate && (
            <>
              <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>
                Import from Excel
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormTarget(null)}>
                New Vendor
              </Button>
            </>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage="No vendors found"
        getRowId={(row) => row._id}
        {...tableProps}
      />

      <VendorFormDialog open={formTarget !== undefined} onClose={() => setFormTarget(undefined)} vendor={formTarget} />
      <ImportExcelDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Vendors from Excel"
        useImportMutation={useImportVendorsMutation}
        entityLabel="vendors"
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete vendor"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
