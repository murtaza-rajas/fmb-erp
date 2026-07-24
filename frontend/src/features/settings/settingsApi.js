import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { queryKeys } from '../../app/queryClient';

export function useCompanySettingsQuery() {
  return useQuery({
    queryKey: queryKeys.companySettings,
    queryFn: async () => (await axiosClient.get('/settings/company')).data.data,
  });
}

export function useUpdateCompanySettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.patch('/settings/company', body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.companySettings }),
  });
}

export function useSystemSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.systemSettings,
    queryFn: async () => (await axiosClient.get('/settings/system')).data.data,
  });
}

export function useUpdateSystemSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.patch('/settings/system', body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings }),
  });
}

export function useApprovalMatrixQuery() {
  return useQuery({
    queryKey: queryKeys.approvalMatrix,
    queryFn: async () => (await axiosClient.get('/settings/approval-matrix')).data.data,
  });
}

export function useCreateApprovalMatrixEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/settings/approval-matrix', body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.approvalMatrix }),
  });
}

export function useUpdateApprovalMatrixEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => axiosClient.patch(`/settings/approval-matrix/${id}`, body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.approvalMatrix }),
  });
}
