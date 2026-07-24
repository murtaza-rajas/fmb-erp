import * as yup from 'yup';
import SimpleCrudPage from '../../../../components/crud/SimpleCrudPage';
import { useStoresQuery, useCreateStoreMutation, useUpdateStoreMutation, useDeleteStoreMutation } from '../storesApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  address: yup.string().nullable(),
  contact: yup.string().nullable(),
});

const fields = [
  { name: 'name', label: 'Store Name', type: 'text', autoFocus: true },
  { name: 'address', label: 'Address', type: 'text' },
  { name: 'contact', label: 'Contact', type: 'text' },
];

const columns = [
  { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
  { header: 'Address', accessorKey: 'address', cell: (info) => info.getValue() || '—' },
  { header: 'Contact', accessorKey: 'contact', cell: (info) => info.getValue() || '—' },
];

export default function StoresPage() {
  return (
    <SimpleCrudPage
      title="Stores"
      subtitle="Store / kitchen locations"
      resourceLabel="Store"
      permissionModule="master"
      columns={columns}
      fields={fields}
      schema={schema}
      toFormValues={(row) => ({ name: row.name, address: row.address || '', contact: row.contact || '' })}
      useListQuery={useStoresQuery}
      useCreateMutation={useCreateStoreMutation}
      useUpdateMutation={useUpdateStoreMutation}
      useRemoveMutation={useDeleteStoreMutation}
      searchFields
    />
  );
}
