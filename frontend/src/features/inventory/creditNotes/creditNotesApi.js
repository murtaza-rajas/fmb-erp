import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useCreditNotesQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.creditNotes(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/credit-notes', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

function useInvalidateCreditNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
}

export function useCreateCreditNoteMutation() {
  const invalidate = useInvalidateCreditNotes();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/inventory/credit-notes', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useSettleCreditNoteMutation() {
  const invalidate = useInvalidateCreditNotes();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/inventory/credit-notes/${id}/settle`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
