import '../../utils/chartSetup';
import { Grid, Card, CardContent, Typography, Box, Chip, Stack, CircularProgress } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { useDashboardSummaryQuery, useVendorPerformanceQuery, useMonthlyReportQuery, usePoStatusBreakdownQuery } from './dashboardApi';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const STATUS_LABELS = {
  draft: 'Draft',
  issued: 'Issued',
  partially_received: 'Partially Received',
  received: 'Received',
  invoiced: 'Invoiced',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

function MonthlyChart({ data }) {
  const labels = data.purchasesByMonth.map((r) => `${r._id.month}/${r._id.year}`);
  const chartData = {
    labels,
    datasets: [
      { label: 'Purchases', data: data.purchasesByMonth.map((r) => r.totalAmount), backgroundColor: '#2F5D8A' },
      {
        label: 'Payments',
        data: labels.map((label) => {
          const match = data.paymentsByMonth.find((p) => `${p._id.month}/${p._id.year}` === label);
          return match?.totalAmount || 0;
        }),
        backgroundColor: '#B8863B',
      },
    ],
  };

  return <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} height={90} />;
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErr, refetch: refetchSummary } = useDashboardSummaryQuery();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendorPerformanceQuery();
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyReportQuery(12);
  const { data: poStatusBreakdown = [], isLoading: poStatusLoading } = usePoStatusBreakdownQuery();

  if (summaryError) return <ErrorState error={summaryErr} onRetry={refetchSummary} />;

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Overview of procurement, payments, and stock" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Today's Purchases"
            value={summary ? currency(summary.todaysPurchases.totalAmount) : ''}
            subValue={summary ? `${summary.todaysPurchases.count} PO(s)` : ''}
            icon={ShoppingCartOutlinedIcon}
            color="primary"
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Pending Approvals"
            value={summary?.pendingApprovals}
            subValue="Payment vouchers"
            icon={PendingActionsOutlinedIcon}
            color="warning"
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Pending Payments"
            value={summary ? currency(summary.pendingPayments.totalAmount) : ''}
            subValue={summary ? `${summary.pendingPayments.count} voucher(s)` : ''}
            icon={PaymentsOutlinedIcon}
            color="secondary"
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Low Stock Items"
            value={summary?.lowStock.count}
            subValue="At or below reorder level"
            icon={WarningAmberOutlinedIcon}
            color="error"
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Pending Purchase Orders"
            value={summary ? currency(summary.pendingPurchaseOrders.totalAmount) : ''}
            subValue={summary ? `${summary.pendingPurchaseOrders.count} PO(s)` : ''}
            icon={AssignmentLateOutlinedIcon}
            color="info"
            loading={summaryLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            label="Inventory Value"
            value={summary ? currency(summary.inventoryValue) : ''}
            subValue="Current stock at standard rate"
            icon={InventoryOutlinedIcon}
            color="info"
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Low Stock Items</Typography>
              {summaryLoading ? (
                <CircularProgress size={20} />
              ) : summary.lowStock.items.length === 0 ? (
                <EmptyState title="No items below reorder level" />
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {summary.lowStock.items.map((i) => (
                    <Chip key={i.itemId} label={`${i.name}: ${i.currentQuantity}/${i.reorderLevel}`} color="warning" variant="outlined" size="small" />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Monthly Purchases vs Payments</Typography>
              {monthlyLoading ? <CircularProgress size={20} /> : <MonthlyChart data={monthly} />}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Vendor Performance</Typography>
              {vendorsLoading ? (
                <CircularProgress size={20} />
              ) : vendors.length === 0 ? (
                <EmptyState title="No vendor activity yet" />
              ) : (
                <Stack spacing={1.5}>
                  {vendors.slice(0, 6).map((v) => (
                    <Box key={v.vendorId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{v.name}</Typography>
                      <Typography variant="body2" fontWeight={600}>{currency(v.totalPurchaseAmount)}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Purchase Order Lifecycle</Typography>
              {poStatusLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {poStatusBreakdown.map((row) => (
                    <Chip
                      key={row.status}
                      label={`${STATUS_LABELS[row.status] || row.status}: ${row.count} (${currency(row.totalAmount)})`}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
