import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useAdvancePaymentsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.advancePayments(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/finance/advance-payments', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

function useInvalidateAdvancePayments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['advancePayments'] });
    queryClient.invalidateQueries({ queryKey: ['vendorLedger'] });
  };
}

export function useCreateAdvancePaymentMutation() {
  const invalidate = useInvalidateAdvancePayments();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/finance/advance-payments', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useAdjustAdvancePaymentMutation() {
  const invalidate = useInvalidateAdvancePayments();
  return useMutation({
    mutationFn: ({ id, ...body }) => axiosClient.patch(`/finance/advance-payments/${id}/adjust`, body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
