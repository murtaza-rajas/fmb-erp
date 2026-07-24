import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useStockReturnsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.stockReturns(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/stock-returns', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateStockReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/stock-returns', body).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockReturns'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['debitNotes'] });
    },
  });
}
