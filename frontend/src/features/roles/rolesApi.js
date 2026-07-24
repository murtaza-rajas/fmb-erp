import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { queryKeys } from '../../app/queryClient';

export function useRolesQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.roles(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/roles', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

// Unpaginated convenience hook for populating <select>/<Autocomplete>
// options elsewhere (user forms, approval-matrix settings, etc).
export function useAllRolesQuery() {
  return useQuery({
    queryKey: queryKeys.roles({ limit: 100 }),
    queryFn: async () => (await axiosClient.get('/roles', { params: { limit: 100 } })).data.data,
  });
}

export function usePermissionsQuery() {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: async () => (await axiosClient.get('/permissions')).data.data,
    staleTime: Infinity, // seed data, effectively static
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/roles', body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionIds }) => axiosClient.patch(`/roles/${id}/permissions`, { permissionIds }).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => axiosClient.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}
