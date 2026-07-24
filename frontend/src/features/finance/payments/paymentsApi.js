import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function usePaymentsQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.payments(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/finance/payments', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useProcessPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/finance/payments', body).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['paymentVouchers'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['vendorLedger'] });
    },
  });
}

export async function downloadPaymentAdvicePdf(id) {
  const response = await axiosClient.get(`/finance/payments/${id}/advice`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `payment-advice-${id}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}
