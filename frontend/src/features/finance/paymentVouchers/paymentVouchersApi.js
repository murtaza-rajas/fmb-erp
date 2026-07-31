import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function usePaymentVouchersQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.paymentVouchers(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/finance/payment-vouchers', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

function useInvalidateVouchers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['paymentVouchers'] });
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
  };
}

// Approving a voucher can waive debit notes, changing their status —
// invalidated separately from useInvalidateVouchers since only approve needs it.
function useInvalidateDebitNotesAfterApproval() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['debitNotes'] });
}

export function useCreatePaymentVoucherMutation() {
  const invalidate = useInvalidateVouchers();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/finance/payment-vouchers', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useApprovePaymentVoucherMutation() {
  const invalidate = useInvalidateVouchers();
  const invalidateDebitNotes = useInvalidateDebitNotesAfterApproval();
  return useMutation({
    mutationFn: ({ id, waivedDebitNoteIds }) =>
      axiosClient.patch(`/finance/payment-vouchers/${id}/approve`, { waivedDebitNoteIds }).then((r) => r.data.data),
    onSuccess: () => {
      invalidate();
      invalidateDebitNotes();
    },
  });
}

export function useRejectPaymentVoucherMutation() {
  const invalidate = useInvalidateVouchers();
  return useMutation({
    mutationFn: ({ id, reason }) => axiosClient.patch(`/finance/payment-vouchers/${id}/reject`, { reason }).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
