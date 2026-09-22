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

// Current stock per item at one store — used to show stock-on-hand beside
// each item when picking items for a store-specific requisition.
export function useStoreStockQuery(storeId) {
  return useQuery({
    queryKey: queryKeys.storeStock(storeId),
    queryFn: async () => (await axiosClient.get('/inventory/store-stock', { params: { storeId } })).data.data,
    enabled: Boolean(storeId),
  });
}

export function useReorderAlertsQuery() {
  return useQuery({
    queryKey: queryKeys.reorderAlerts,
    queryFn: async () => (await axiosClient.get('/inventory/reorder-alerts')).data.data,
  });
}
