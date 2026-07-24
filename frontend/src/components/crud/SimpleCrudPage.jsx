import { useMemo, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '../PageHeader';
import DataTable from '../DataTable';
import ConfirmDialog from '../ConfirmDialog';
import { usePermission } from '../../hooks/usePermission';
import { useTableState } from '../../hooks/useTableState';
import SimpleCrudFormDialog from './SimpleCrudFormDialog';

// Naive `${word}s` breaks for "Category" -> "Categorys" and "Tax" -> "Taxs" —
// handle the common English pluralization rules actually needed by this
// codebase's resource labels.
function pluralize(word) {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

// Generic list+create+edit+delete page for the simple lookup masters
// (Category, Unit, Tax, Payment Terms, Store — all genuinely the same
// shape). Mirrors the backend's genericMaster factory for the same reason:
// one implementation instead of five nearly-identical ones.
export default function SimpleCrudPage({
  title,
  subtitle,
  resourceLabel,
  permissionModule, // e.g. 'master' -> checks master:create/update/delete (most masters follow this)
  permissions, // explicit override { create, update, delete } for resources that don't follow permissionModule's convention
  columns,
  fields,
  schema,
  toFormValues,
  useListQuery,
  useCreateMutation,
  useUpdateMutation,
  useRemoveMutation,
  searchFields,
}) {
  const permissionKeys = permissions || {
    create: `${permissionModule}:create`,
    update: `${permissionModule}:update`,
    delete: `${permissionModule}:delete`,
  };
  const canCreate = usePermission(permissionKeys.create);
  const canUpdate = usePermission(permissionKeys.update);
  const canDelete = usePermission(permissionKeys.delete);

  const { queryParams, tableProps } = useTableState();
  const { data, isLoading, isError, error, refetch } = useListQuery(queryParams);

  const [formTarget, setFormTarget] = useState(undefined); // undefined=closed, null=create, row=edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { mutateAsync: create, isPending: creating, error: createError } = useCreateMutation();
  const { mutateAsync: update, isPending: updating, error: updateError } = useUpdateMutation();
  const { mutateAsync: remove, isPending: deleting } = useRemoveMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (values) => {
    if (formTarget) {
      await update({ id: formTarget._id, ...values });
      enqueueSnackbar(`${resourceLabel} updated`, { variant: 'success' });
    } else {
      await create(values);
      enqueueSnackbar(`${resourceLabel} created`, { variant: 'success' });
    }
    setFormTarget(undefined);
  };

  const handleDelete = async () => {
    await remove(deleteTarget._id);
    enqueueSnackbar(`${resourceLabel} deleted`, { variant: 'success' });
    setDeleteTarget(null);
  };

  const tableColumns = useMemo(
    () => [
      ...columns,
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <>
            {canUpdate && (
              <Tooltip title={`Edit ${resourceLabel}`}>
                <IconButton size="small" onClick={() => setFormTarget(info.row.original)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title={`Delete ${resourceLabel}`}>
                <IconButton size="small" onClick={() => setDeleteTarget(info.row.original)}>
                  <DeleteOutlineIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ),
      },
    ],
    [columns, canUpdate, canDelete, resourceLabel]
  );

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormTarget(null)}>New {resourceLabel}</Button>}
      />

      <DataTable
        columns={tableColumns}
        data={data?.items || []}
        rowCount={data?.meta?.total || 0}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        emptyMessage={`No ${pluralize(resourceLabel.toLowerCase())} found`}
        getRowId={(row) => row._id}
        onSearchChange={searchFields ? tableProps.onSearchChange : undefined}
        {...tableProps}
      />

      <SimpleCrudFormDialog
        open={formTarget !== undefined}
        onClose={() => setFormTarget(undefined)}
        onSubmit={handleSubmit}
        resourceLabel={resourceLabel}
        fields={fields}
        schema={schema}
        editingRow={formTarget}
        toFormValues={toFormValues}
        isPending={creating || updating}
        error={createError || updateError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${resourceLabel}`}
        description={`This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
