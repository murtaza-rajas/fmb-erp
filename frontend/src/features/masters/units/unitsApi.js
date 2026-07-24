import { createCrudHooks } from '../../../utils/createCrudHooks';
import { queryKeys } from '../../../app/queryClient';

export const {
  useList: useUnitsQuery,
  useCreate: useCreateUnitMutation,
  useUpdate: useUpdateUnitMutation,
  useRemove: useDeleteUnitMutation,
} = createCrudHooks({ resourcePath: '/masters/units', queryKey: queryKeys.units });
