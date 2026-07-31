import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useDebitNotesQuery(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.debitNotes(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/debit-notes', { params });
      return { items: data.data, meta: data.meta };
    },
    enabled,
    placeholderData: (prev) => prev,
  });
}

function useInvalidateDebitNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['debitNotes'] });
}

export function useCreateDebitNoteMutation() {
  const invalidate = useInvalidateDebitNotes();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/debit-notes', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useSettleDebitNoteMutation() {
  const invalidate = useInvalidateDebitNotes();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/inventory/debit-notes/${id}/settle`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
