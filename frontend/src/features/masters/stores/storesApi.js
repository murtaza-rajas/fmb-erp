import { createCrudHooks } from '../../../utils/createCrudHooks';
import { queryKeys } from '../../../app/queryClient';

export const {
  useList: useStoresQuery,
  useCreate: useCreateStoreMutation,
  useUpdate: useUpdateStoreMutation,
  useRemove: useDeleteStoreMutation,
} = createCrudHooks({ resourcePath: '/masters/stores', queryKey: queryKeys.stores });
