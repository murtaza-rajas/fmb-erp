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
// The list endpoint caps `limit` at 100 server-side, so a single request
// silently truncates once the item master grows past that — this fetches
// every page so pickers always offer the full item set.
export function useAllItemsQuery(search = '') {
  return useQuery({
    queryKey: queryKeys.items({ all: true, search }),
    queryFn: async () => {
      // Sort by _id (always unique) rather than the default createdAt — many
      // items share an identical createdAt from bulk import, which made the
      // skip/limit window unstable across pages (items shifting between
      // pages, causing duplicates and silently dropped items).
      let page = 1;
      let items = [];
      let total = Infinity;
      while (items.length < total) {
        const { data } = await axiosClient.get('/masters/items', { params: { page, limit: 100, search, sort: '_id' } });
        items = items.concat(data.data);
        total = data.meta.total;
        page += 1;
      }
      return items;
    },
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
