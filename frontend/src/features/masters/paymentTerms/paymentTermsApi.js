import { createCrudHooks } from '../../../utils/createCrudHooks';
import { queryKeys } from '../../../app/queryClient';

export const {
  useList: usePaymentTermsQuery,
  useCreate: useCreatePaymentTermMutation,
  useUpdate: useUpdatePaymentTermMutation,
  useRemove: useDeletePaymentTermMutation,
} = createCrudHooks({ resourcePath: '/masters/payment-terms', queryKey: queryKeys.paymentTerms });
