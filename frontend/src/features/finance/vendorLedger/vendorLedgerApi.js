import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useOutstandingPaymentsQuery() {
  return useQuery({
    queryKey: queryKeys.outstandingPayments,
    queryFn: async () => (await axiosClient.get('/finance/vendor-ledger/outstanding-payments')).data.data,
  });
}

export function useVendorLedgerQuery(vendorId, params = {}) {
  return useQuery({
    queryKey: queryKeys.vendorLedger(vendorId, params),
    queryFn: async () => {
      const { data } = await axiosClient.get(`/finance/vendor-ledger/${vendorId}`, { params });
      return { items: data.data, meta: data.meta };
    },
    enabled: Boolean(vendorId),
    placeholderData: (prev) => prev,
  });
}
