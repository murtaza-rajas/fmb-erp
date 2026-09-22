import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useMaterialIssueVouchersQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.materialIssueVouchers(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/material-issues', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useMaterialIssueVoucherQuery(id) {
  return useQuery({
    queryKey: queryKeys.materialIssueVoucher(id),
    queryFn: async () => (await axiosClient.get(`/inventory/material-issues/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function useCreateMaterialIssueVoucherMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/material-issues', body).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialIssueVouchers'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
    },
  });
}
