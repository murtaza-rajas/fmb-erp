import { createCrudHooks } from '../../../utils/createCrudHooks';
import { queryKeys } from '../../../app/queryClient';

export const {
  useList: useThaaliBudgetsQuery,
  useCreate: useCreateThaaliBudgetMutation,
  useUpdate: useUpdateThaaliBudgetMutation,
  useRemove: useDeleteThaaliBudgetMutation,
} = createCrudHooks({ resourcePath: '/masters/thaali-budgets', queryKey: queryKeys.thaaliBudgets });
