import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useTransfersQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.transfers(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/transfers', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

function useInvalidateTransfers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
  };
}

export function useCreateTransferMutation() {
  const invalidate = useInvalidateTransfers();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/transfers', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useMarkTransferInTransitMutation() {
  const invalidate = useInvalidateTransfers();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/inventory/transfers/${id}/in-transit`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useCompleteTransferMutation() {
  const invalidate = useInvalidateTransfers();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/inventory/transfers/${id}/complete`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
