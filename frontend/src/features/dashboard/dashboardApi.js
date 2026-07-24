import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../services/axiosClient';
import { queryKeys } from '../../app/queryClient';

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => (await axiosClient.get('/dashboard/summary')).data.data,
    refetchInterval: 60_000,
  });
}

export function useVendorPerformanceQuery() {
  return useQuery({
    queryKey: queryKeys.dashboardVendorPerformance,
    queryFn: async () => (await axiosClient.get('/dashboard/vendor-performance')).data.data,
  });
}

export function useMonthlyReportQuery(months = 12) {
  return useQuery({
    queryKey: queryKeys.dashboardMonthlyReport(months),
    queryFn: async () => (await axiosClient.get('/dashboard/monthly-report', { params: { months } })).data.data,
  });
}
