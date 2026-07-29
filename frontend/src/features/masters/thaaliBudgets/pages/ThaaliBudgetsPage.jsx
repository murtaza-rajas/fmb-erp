import * as yup from 'yup';
import SimpleCrudPage from '../../../../components/crud/SimpleCrudPage';
import {
  useThaaliBudgetsQuery,
  useCreateThaaliBudgetMutation,
  useUpdateThaaliBudgetMutation,
  useDeleteThaaliBudgetMutation,
} from '../thaaliBudgetsApi';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CATEGORY_OPTIONS = [
  { value: 'fmb', label: 'FMB' },
  { value: 'safar_thaali', label: 'Safar Thaali' },
  { value: 'event', label: 'Event' },
];

const schema = yup.object({
  category: yup.string().oneOf(['fmb', 'safar_thaali', 'event']).required('Category is required'),
  weekStartDate: yup.string().required('A date within the target week is required'),
  amount: yup.number().typeError('Amount must be a number').min(0, 'Amount cannot be negative').required('Amount is required'),
});

const fields = [
  { name: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS, autoFocus: true },
  { name: 'weekStartDate', label: 'Any Date in the Week', type: 'date' },
  { name: 'amount', label: 'Weekly Budget Amount', type: 'number' },
];

const columns = [
  { header: 'Category', accessorKey: 'category', cell: (info) => CATEGORY_OPTIONS.find((c) => c.value === info.getValue())?.label || info.getValue() },
  { header: 'Week Starting (Mon)', accessorKey: 'weekStartDate', cell: (info) => new Date(info.getValue()).toLocaleDateString('en-IN') },
  { header: 'Amount', accessorKey: 'amount', cell: (info) => currency(info.getValue()) },
];

export default function ThaaliBudgetsPage() {
  return (
    <SimpleCrudPage
      title="Thaali Budgets"
      subtitle="Weekly budget per category, used by the Thaali Cost Report to show variance"
      resourceLabel="Thaali Budget"
      permissionModule="master"
      columns={columns}
      fields={fields}
      schema={schema}
      toFormValues={(row) => ({ category: row.category, weekStartDate: (row.weekStartDate || '').slice(0, 10), amount: row.amount })}
      useListQuery={useThaaliBudgetsQuery}
      useCreateMutation={useCreateThaaliBudgetMutation}
      useUpdateMutation={useUpdateThaaliBudgetMutation}
      useRemoveMutation={useDeleteThaaliBudgetMutation}
    />
  );
}
