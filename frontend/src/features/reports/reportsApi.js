import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';

const CONTENT_TYPES = {
  csv: 'text/csv',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const EXTENSIONS = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

function useReport(key, endpoint, params = {}, options = {}) {
  return useQuery({
    queryKey: ['reports', key, params],
    queryFn: async () => {
      const { data } = await axiosClient.get(endpoint, { params });
      return data.data;
    },
    ...options,
  });
}

export const usePurchaseReportQuery = (params) => useReport('purchases', '/reports/purchases', params);
export const useVendorReportQuery = () => useReport('vendors', '/reports/vendors');
export const useInventoryReportQuery = () => useReport('inventory', '/reports/inventory');
export const useStockLedgerReportQuery = (params) => useReport('stock-ledger', '/reports/stock-ledger', params);
export const usePaymentReportQuery = (params) => useReport('payments', '/reports/payments', params);
export const useAuditReportQuery = (params) => useReport('audit', '/reports/audit', params);
export const useUserActivityReportQuery = (params) =>
  useReport('user-activity', '/reports/user-activity', params, { enabled: Boolean(params?.userId) });
export const useThaaliCostReportQuery = (params) => useReport('thaali-cost', '/reports/thaali-cost', params);

export async function downloadReportExport(endpoint, format, params, filename) {
  const response = await axiosClient.get(endpoint, {
    params: { ...params, format },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: CONTENT_TYPES[format] }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${EXTENSIONS[format]}`;
  link.click();
  window.URL.revokeObjectURL(url);
}
