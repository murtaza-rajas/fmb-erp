import { useMutation, useQuery } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { getDeviceId } from '../../services/tokenStorage';
import { queryKeys } from '../../app/queryClient';

async function login({ email, password }) {
  const { data } = await axiosClient.post('/auth/login', { email, password, deviceId: getDeviceId() });
  return data.data;
}

export function useLoginMutation() {
  return useMutation({ mutationFn: login });
}

export function useMeQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await axiosClient.get('/auth/me')).data.data,
    ...options,
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: (refreshToken) => axiosClient.post('/auth/logout', { refreshToken }),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email) => axiosClient.post('/auth/forgot-password', { email }),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, newPassword }) => axiosClient.post('/auth/reset-password', { token, newPassword }),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) => axiosClient.post('/auth/change-password', { currentPassword, newPassword }),
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => (await axiosClient.get('/auth/sessions')).data.data,
  });
}

export function useRevokeSessionMutation() {
  return useMutation({
    mutationFn: (id) => axiosClient.delete(`/auth/sessions/${id}`),
  });
}
