import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../services/axiosClient';
import { queryKeys } from '../../../app/queryClient';

export function useExpensesQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.expenses(params),
    queryFn: async () => {
      const { data } = await axiosClient.get('/finance/expenses', { params });
      return { items: data.data, meta: data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useExpenseQuery(id) {
  return useQuery({
    queryKey: queryKeys.expense(id),
    queryFn: async () => (await axiosClient.get(`/finance/expenses/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['expenses'] });
}

export function useCreateExpenseMutation() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (body) => axiosClient.post('/finance/expenses', body).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useApproveExpenseMutation() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (id) => axiosClient.patch(`/finance/expenses/${id}/approve`).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}

export function useRejectExpenseMutation() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, reason }) => axiosClient.patch(`/finance/expenses/${id}/reject`, { reason }).then((r) => r.data.data),
    onSuccess: invalidate,
  });
}
