import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useVendorsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.vendors(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/masters/vendors', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useAllVendorsQuery(search = '') {
  return useQuery({
    queryKey: queryKeys.vendors({ limit: 100, search }),
    queryFn: async () => (await axiosClient.get('/masters/vendors', { params: { limit: 100, search } })).data.data,
  });
}

export function useVendorQuery(id) {
  return useQuery({
    queryKey: queryKeys.vendor(id),
    queryFn: async () => (await axiosClient.get(`/masters/vendors/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['vendors'] });
}

export function useCreateVendorMutation() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/masters/vendors', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useUpdateVendorMutation() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: ({ id, ...body }) => axiosClient.patch(`/masters/vendors/${id}`, body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useDeleteVendorMutation() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (id) => axiosClient.delete(`/masters/vendors/${id}`),
    onSuccess: invalidate,
  });
}

// --- Bank accounts sub-resource ---

export function useVendorBankAccountsQuery(vendorId) {
  return useQuery({
    queryKey: queryKeys.vendorBankAccounts(vendorId),
    queryFn: async () => (await axiosClient.get(`/masters/vendors/${vendorId}/bank-accounts`)).data.data,
    enabled: Boolean(vendorId),
  });
}

export function useAddVendorBankAccountMutation(vendorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post(`/masters/vendors/${vendorId}/bank-accounts`, body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vendorBankAccounts(vendorId) }),
  });
}

export function useRemoveVendorBankAccountMutation(vendorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId) => axiosClient.delete(`/masters/vendors/${vendorId}/bank-accounts/${accountId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vendorBankAccounts(vendorId) }),
  });
}

// --- Item rates / quotation history sub-resource ---

export function useVendorItemRatesQuery(vendorId, itemId) {
  return useQuery({
    queryKey: queryKeys.vendorItemRates(vendorId),
    queryFn: async () => (await axiosClient.get(`/masters/vendors/${vendorId}/item-rates`, { params: { itemId } })).data.data,
    enabled: Boolean(vendorId),
  });
}

export function useAddVendorItemRateMutation(vendorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post(`/masters/vendors/${vendorId}/item-rates`, body).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vendorItemRates(vendorId) }),
  });
}
