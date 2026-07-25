import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useItemsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.items(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/masters/items', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

// Unpaginated-ish convenience for pickers (PRN/PO/invoice item selection).
export function useAllItemsQuery(search = '') {
  return useQuery({
    queryKey: queryKeys.items({ limit: 100, search }),
    queryFn: async () => (await axiosClient.get('/masters/items', { params: { limit: 100, search } })).data.data,
  });
}

function useInvalidateItems() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['items'] });
}

export function useCreateItemMutation() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/masters/items', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useUpdateItemMutation() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, ...body }) => axiosClient.patch(`/masters/items/${id}`, body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useDeleteItemMutation() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (id) => axiosClient.delete(`/masters/items/${id}`),
    onSuccess: invalidate,
  });
}

export function useImportItemsMutation() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (formData) => axiosClient.post('/masters/items/import', formData).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useLowStockCheckQuery(itemId) {
  return useQuery({
    queryKey: ['items', itemId, 'lowStockCheck'],
    queryFn: async () => (await axiosClient.get(`/masters/items/${itemId}/low-stock-check`)).data.data,
    enabled: Boolean(itemId),
  });
}
