import { createCrudHooks } from '../../../utils/createCrudHooks';
import { queryKeys } from '../../../app/queryClient';

export const {
  useList: useCategoriesQuery,
  useCreate: useCreateCategoryMutation,
  useUpdate: useUpdateCategoryMutation,
  useRemove: useDeleteCategoryMutation,
} = createCrudHooks({ resourcePath: '/masters/categories', queryKey: queryKeys.categories });
