import * as yup from 'yup';
import SimpleCrudPage from '../../../../components/crud/SimpleCrudPage';
import { usePaymentTermsQuery, useCreatePaymentTermMutation, useUpdatePaymentTermMutation, useDeletePaymentTermMutation } from '../paymentTermsApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  days: yup.number().typeError('Days must be a number').integer().min(0, 'Days cannot be negative').required('Days is required'),
  description: yup.string().nullable(),
});

const fields = [
  { name: 'name', label: 'Term Name (e.g. Net 30)', type: 'text', autoFocus: true },
  { name: 'days', label: 'Days', type: 'number' },
  { name: 'description', label: 'Description', type: 'text' },
];

const columns = [
  { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
  { header: 'Days', accessorKey: 'days' },
  { header: 'Description', accessorKey: 'description', cell: (info) => info.getValue() || '—' },
];

export default function PaymentTermsPage() {
  return (
    <SimpleCrudPage
      title="Payment Terms"
      subtitle="Vendor payment terms"
      resourceLabel="Payment Term"
      permissionModule="master"
      columns={columns}
      fields={fields}
      schema={schema}
      toFormValues={(row) => ({ name: row.name, days: row.days, description: row.description || '' })}
      useListQuery={usePaymentTermsQuery}
      useCreateMutation={useCreatePaymentTermMutation}
      useUpdateMutation={useUpdatePaymentTermMutation}
      useRemoveMutation={useDeletePaymentTermMutation}
      searchFields
    />
  );
}
