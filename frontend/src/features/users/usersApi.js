import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { queryKeys } from '../../app/queryClient';

export function useUsersQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/users', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['users'] });
}

export function useCreateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/users', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, ...body }) => axiosClient.patch(`/users/${id}`, body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useUpdateUserStatusMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, status }) => axiosClient.patch(`/users/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useAssignUserRoleMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, roleId }) => axiosClient.patch(`/users/${id}/role`, { roleId }).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useDeleteUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id) => axiosClient.delete(`/users/${id}`),
    onSuccess: invalidate,
  });
}
