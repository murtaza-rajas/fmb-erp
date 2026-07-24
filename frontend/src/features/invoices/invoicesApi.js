import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { queryKeys } from '../../app/queryClient';

export function useInvoicesQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/invoices', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useInvoiceQuery(id) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: async () => (await axiosClient.get(`/invoices/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function useInvoiceMatchHistoryQuery(id) {
  return useQuery({
    queryKey: queryKeys.invoiceMatchHistory(id),
    queryFn: async () => (await axiosClient.get(`/invoices/${id}/match-history`)).data.data,
    enabled: Boolean(id),
  });
}

function useInvalidateInvoices(id) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    if (id) queryClient.invalidateQueries({ queryKey: queryKeys.invoiceMatchHistory(id) });
  };
}

export function useCreateInvoiceMutation() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/invoices', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useMatchInvoiceMutation(id) {
  const invalidate = useInvalidateInvoices(id);
  return useMutation({
    mutationFn: () => axiosClient.post(`/invoices/${id}/match`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useHoldInvoiceMutation(id) {
  const invalidate = useInvalidateInvoices(id);
  return useMutation({
    mutationFn: (reason) => axiosClient.patch(`/invoices/${id}/hold`, { reason }).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useReleaseInvoiceMutation(id) {
  const invalidate = useInvalidateInvoices(id);
  return useMutation({
    mutationFn: () => axiosClient.patch(`/invoices/${id}/release`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
