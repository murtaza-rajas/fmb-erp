import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../services/axiosClient';

// Factory for the simple lookup masters (Category, Unit, Tax, Payment Terms,
// Store) that are all plain list/create/update/delete — mirrors the
// backend's genericMaster.service.js factory for the same reason: these
// genuinely share one shape, so one implementation instead of five nearly-
// identical ones is real duplication removed, not premature abstraction.
export function createCrudHooks({ resourcePath, queryKey }) {
  function useList(params = {}) {
    return useQuery({
      queryKey: queryKey(params),
      queryFn: async () => {
        const { data } = await axiosClient.get(resourcePath, { params });
        return { items: data.data, meta: data.meta };
      },
      placeholderData: (prev) => prev,
    });
  }

  function useGet(id) {
    return useQuery({
      queryKey: [...queryKey({}), id],
      queryFn: async () => (await axiosClient.get(`${resourcePath}/${id}`)).data.data,
      enabled: Boolean(id),
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body) => axiosClient.post(resourcePath, body).then((r) => r.data.data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey({}).slice(0, 1) }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...body }) => axiosClient.patch(`${resourcePath}/${id}`, body).then((r) => r.data.data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey({}).slice(0, 1) }),
    });
  }

  function useRemove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id) => axiosClient.delete(`${resourcePath}/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey({}).slice(0, 1) }),
    });
  }

  return { useList, useGet, useCreate, useUpdate, useRemove };
}
