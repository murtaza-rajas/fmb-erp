import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useGrnsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.grns(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/grns', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useGrnQuery(id) {
  return useQuery({
    queryKey: queryKeys.grn(id),
    queryFn: async () => (await axiosClient.get(`/inventory/grns/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function useCreateGrnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/grns', body).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['debitNotes'] });
    },
  });
}
