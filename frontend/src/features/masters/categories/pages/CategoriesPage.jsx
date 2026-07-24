import * as yup from 'yup';
import SimpleCrudPage from '../../../../components/crud/SimpleCrudPage';
import { useCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } from '../categoriesApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  description: yup.string().nullable(),
});

const fields = [
  { name: 'name', label: 'Category Name', type: 'text', autoFocus: true },
  { name: 'description', label: 'Description', type: 'text' },
];

const columns = [
  { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
  { header: 'Description', accessorKey: 'description', cell: (info) => info.getValue() || '—' },
];

export default function CategoriesPage() {
  return (
    <SimpleCrudPage
      title="Categories"
      subtitle="Item categories"
      resourceLabel="Category"
      permissionModule="master"
      columns={columns}
      fields={fields}
      schema={schema}
      toFormValues={(row) => ({ name: row.name, description: row.description || '' })}
      useListQuery={useCategoriesQuery}
      useCreateMutation={useCreateCategoryMutation}
      useUpdateMutation={useUpdateCategoryMutation}
      useRemoveMutation={useDeleteCategoryMutation}
      searchFields
    />
  );
}
