import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function usePurchaseOrdersQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/procurement/purchase-orders', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

// For GRN/Invoice creation pickers — POs that can still receive goods.
export function useReceivablePurchaseOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.purchaseOrders({ limit: 100, filter: { status: 'issued' } }),
    queryFn: async () => (await axiosClient.get('/procurement/purchase-orders', { params: { limit: 100, filter: { status: 'issued' } } })).data.data,
  });
}

export function usePurchaseOrderQuery(id) {
  return useQuery({
    queryKey: queryKeys.purchaseOrder(id),
    queryFn: async () => (await axiosClient.get(`/procurement/purchase-orders/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function usePoTimelineQuery(id) {
  return useQuery({
    queryKey: queryKeys.poTimeline(id),
    queryFn: async () => (await axiosClient.get(`/procurement/purchase-orders/${id}/timeline`)).data.data,
    enabled: Boolean(id),
  });
}

function useInvalidatePOs(id) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    if (id) queryClient.invalidateQueries({ queryKey: queryKeys.poTimeline(id) });
  };
}

export function useCreatePurchaseOrderMutation() {
  const invalidate = useInvalidatePOs();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/procurement/purchase-orders', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useIssuePurchaseOrderMutation(id) {
  const invalidate = useInvalidatePOs(id);
  return useMutation({
    mutationFn: () => axiosClient.patch(`/procurement/purchase-orders/${id}/issue`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useCancelPurchaseOrderMutation(id) {
  const invalidate = useInvalidatePOs(id);
  return useMutation({
    mutationFn: (reason) => axiosClient.patch(`/procurement/purchase-orders/${id}/cancel`, { reason }).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useRevisePurchaseOrderMutation(id) {
  const invalidate = useInvalidatePOs(id);
  return useMutation({
    mutationFn: (body) => axiosClient.post(`/procurement/purchase-orders/${id}/revise`, body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useSendPoEmailMutation(id) {
  const invalidate = useInvalidatePOs(id);
  return useMutation({
    mutationFn: () => axiosClient.post(`/procurement/purchase-orders/${id}/send-email`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export async function downloadPoPdf(id, poNumber) {
  const response = await axiosClient.get(`/procurement/purchase-orders/${id}/print`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${poNumber}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}
