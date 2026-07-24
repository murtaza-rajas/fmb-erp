import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { queryKeys } from '../../app/queryClient';

export function useListNotificationsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.notifications(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/notifications', { params });
      return { items: data.data, meta: data.meta };
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => axiosClient.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useRegisterDeviceMutation() {
  return useMutation({
    mutationFn: (body) => axiosClient.post('/notifications/devices', body),
  });
}

export function useDeregisterDeviceMutation() {
  return useMutation({
    mutationFn: (deviceId) => axiosClient.delete(`/notifications/devices/${deviceId}`),
  });
}
