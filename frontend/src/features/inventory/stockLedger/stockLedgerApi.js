import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useStockLedgerQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.stockLedger(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/inventory/stock-ledger', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useStockBalanceQuery(itemId, storeId) {
  return useQuery({
    queryKey: queryKeys.stockBalance({ itemId, storeId }),
    queryFn: async () => (await axiosClient.get('/inventory/stock-balance', { params: { itemId, storeId } })).data.data,
    enabled: Boolean(itemId && storeId),
  });
}

export function useReorderAlertsQuery() {
  return useQuery({
    queryKey: queryKeys.reorderAlerts,
    queryFn: async () => (await axiosClient.get('/inventory/reorder-alerts')).data.data,
  });
}
