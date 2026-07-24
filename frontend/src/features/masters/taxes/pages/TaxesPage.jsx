import * as yup from 'yup';
import SimpleCrudPage from '../../../../components/crud/SimpleCrudPage';
import StatusBadge from '../../../../components/StatusBadge';
import { useTaxesQuery, useCreateTaxMutation, useUpdateTaxMutation, useDeleteTaxMutation } from '../taxesApi';

const TAX_TYPE_OPTIONS = [
  { value: 'GST', label: 'GST' },
  { value: 'VAT', label: 'VAT' },
  { value: 'CESS', label: 'CESS' },
  { value: 'NONE', label: 'None' },
];

const schema = yup.object({
  name: yup.string().required('Name is required'),
  rate: yup.number().typeError('Rate must be a number').min(0, 'Rate cannot be negative').required('Rate is required'),
  type: yup.string().oneOf(['GST', 'VAT', 'CESS', 'NONE']).required('Type is required'),
});

const fields = [
  { name: 'name', label: 'Tax Name', type: 'text', autoFocus: true },
  { name: 'rate', label: 'Rate (%)', type: 'number' },
  { name: 'type', label: 'Type', type: 'select', options: TAX_TYPE_OPTIONS },
];

const columns = [
  { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
  { header: 'Rate', accessorKey: 'rate', cell: (info) => `${info.getValue()}%` },
  { header: 'Type', accessorKey: 'type', cell: (info) => <StatusBadge status={info.getValue().toLowerCase()} /> },
];

export default function TaxesPage() {
  return (
    <SimpleCrudPage
      title="Taxes"
      subtitle="Tax rates applied to items"
      resourceLabel="Tax"
      permissionModule="master"
      columns={columns}
      fields={fields}
      schema={schema}
      toFormValues={(row) => ({ name: row.name, rate: row.rate, type: row.type })}
      useListQuery={useTaxesQuery}
      useCreateMutation={useCreateTaxMutation}
      useUpdateMutation={useUpdateTaxMutation}
      useRemoveMutation={useDeleteTaxMutation}
      searchFields
    />
  );
}
