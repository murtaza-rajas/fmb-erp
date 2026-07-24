import * as yup from 'yup';
import SimpleCrudPage from '../../../../components/crud/SimpleCrudPage';
import { useUnitsQuery, useCreateUnitMutation, useUpdateUnitMutation, useDeleteUnitMutation } from '../unitsApi';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  symbol: yup.string().required('Symbol is required'),
});

const fields = [
  { name: 'name', label: 'Unit Name', type: 'text', autoFocus: true },
  { name: 'symbol', label: 'Symbol', type: 'text' },
];

const columns = [
  { header: 'Name', accessorKey: 'name', meta: { sortKey: 'name' } },
  { header: 'Symbol', accessorKey: 'symbol' },
];

export default function UnitsPage() {
  return (
    <SimpleCrudPage
      title="Units"
      subtitle="Units of measure"
      resourceLabel="Unit"
      permissionModule="master"
      columns={columns}
      fields={fields}
      schema={schema}
      toFormValues={(row) => ({ name: row.name, symbol: row.symbol })}
      useListQuery={useUnitsQuery}
      useCreateMutation={useCreateUnitMutation}
      useUpdateMutation={useUpdateUnitMutation}
      useRemoveMutation={useDeleteUnitMutation}
      searchFields
    />
  );
}
