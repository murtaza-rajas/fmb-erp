import { createCrudHooks } from '../../../utils/createCrudHooks';
import { queryKeys } from '../../../app/queryClient';

export const {
  useList: useTaxesQuery,
  useCreate: useCreateTaxMutation,
  useUpdate: useUpdateTaxMutation,
  useRemove: useDeleteTaxMutation,
} = createCrudHooks({ resourcePath: '/masters/taxes', queryKey: queryKeys.taxes });
