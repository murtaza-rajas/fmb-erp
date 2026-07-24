import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useRequisitionsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.requisitions(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/procurement/requisitions', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

// Convenience for PO creation: only requisitions still open to convert.
export function useOpenRequisitionsQuery() {
  return useQuery({
    queryKey: queryKeys.requisitions({ limit: 100, filter: { status: 'submitted' } }),
    queryFn: async () => (await axiosClient.get('/procurement/requisitions', { params: { limit: 100, filter: { status: 'submitted' } } })).data.data,
  });
}

export function useRequisitionQuery(id) {
  return useQuery({
    queryKey: queryKeys.requisition(id),
    queryFn: async () => (await axiosClient.get(`/procurement/requisitions/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

function useInvalidateRequisitions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['requisitions'] });
}

export function useCreateRequisitionMutation() {
  const invalidate = useInvalidateRequisitions();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/procurement/requisitions', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useCancelRequisitionMutation() {
  const invalidate = useInvalidateRequisitions();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/procurement/requisitions/${id}/cancel`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
