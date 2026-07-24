import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useAdjustmentsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.adjustments(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/adjustments', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateAdjustmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/adjustments', body).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
    },
  });
}
