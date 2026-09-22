import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from './NotFoundPage';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('../features/auth/pages/ProfilePage'));
const ProfileOverviewPage = lazy(() => import('../features/auth/pages/ProfileOverviewPage'));
const ChangePasswordPage = lazy(() => import('../features/auth/pages/ChangePasswordPage'));
const SessionsPage = lazy(() => import('../features/auth/pages/SessionsPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const UsersListPage = lazy(() => import('../features/users/pages/UsersListPage'));
const RolesListPage = lazy(() => import('../features/roles/pages/RolesListPage'));
const CategoriesPage = lazy(() => import('../features/masters/categories/pages/CategoriesPage'));
const UnitsPage = lazy(() => import('../features/masters/units/pages/UnitsPage'));
const TaxesPage = lazy(() => import('../features/masters/taxes/pages/TaxesPage'));
const PaymentTermsPage = lazy(() => import('../features/masters/paymentTerms/pages/PaymentTermsPage'));
const ThaaliBudgetsPage = lazy(() => import('../features/masters/thaaliBudgets/pages/ThaaliBudgetsPage'));
const StoresPage = lazy(() => import('../features/masters/stores/pages/StoresPage'));
const ItemsListPage = lazy(() => import('../features/masters/items/pages/ItemsListPage'));
const VendorsListPage = lazy(() => import('../features/masters/vendors/pages/VendorsListPage'));
const VendorDetailPage = lazy(() => import('../features/masters/vendors/pages/VendorDetailPage'));
const RequisitionsListPage = lazy(() => import('../features/procurement/requisitions/pages/RequisitionsListPage'));
const PurchaseOrdersListPage = lazy(() => import('../features/procurement/purchaseOrders/pages/PurchaseOrdersListPage'));
const PurchaseOrderDetailPage = lazy(() => import('../features/procurement/purchaseOrders/pages/PurchaseOrderDetailPage'));
const GrnsListPage = lazy(() => import('../features/inventory/grns/pages/GrnsListPage'));
const StockLedgerPage = lazy(() => import('../features/inventory/stockLedger/pages/StockLedgerPage'));
const ReorderAlertsPage = lazy(() => import('../features/inventory/stockLedger/pages/ReorderAlertsPage'));
const AdjustmentsListPage = lazy(() => import('../features/inventory/adjustments/pages/AdjustmentsListPage'));
const TransfersListPage = lazy(() => import('../features/inventory/transfers/pages/TransfersListPage'));
const DebitNotesListPage = lazy(() => import('../features/inventory/debitNotes/pages/DebitNotesListPage'));
const CreditNotesListPage = lazy(() => import('../features/inventory/creditNotes/pages/CreditNotesListPage'));
const StockReturnsListPage = lazy(() => import('../features/inventory/stockReturns/pages/StockReturnsListPage'));
const MaterialIssueVouchersListPage = lazy(() => import('../features/inventory/materialIssues/pages/MaterialIssueVouchersListPage'));
const InvoicesListPage = lazy(() => import('../features/invoices/pages/InvoicesListPage'));
const InvoiceDetailPage = lazy(() => import('../features/invoices/pages/InvoiceDetailPage'));
const PaymentVouchersListPage = lazy(() => import('../features/finance/paymentVouchers/pages/PaymentVouchersListPage'));
const PaymentsListPage = lazy(() => import('../features/finance/payments/pages/PaymentsListPage'));
const AdvancePaymentsListPage = lazy(() => import('../features/finance/advancePayments/pages/AdvancePaymentsListPage'));
const VendorLedgerPage = lazy(() => import('../features/finance/vendorLedger/pages/VendorLedgerPage'));
const ExpensesListPage = lazy(() => import('../features/finance/expenses/pages/ExpensesListPage'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));
const PurchaseReportPage = lazy(() => import('../features/reports/pages/PurchaseReportPage'));
const VendorReportPage = lazy(() => import('../features/reports/pages/VendorReportPage'));
const InventoryReportPage = lazy(() => import('../features/reports/pages/InventoryReportPage'));
const StockLedgerReportPage = lazy(() => import('../features/reports/pages/StockLedgerReportPage'));
const PaymentReportPage = lazy(() => import('../features/reports/pages/PaymentReportPage'));
const AuditReportPage = lazy(() => import('../features/reports/pages/AuditReportPage'));
const UserActivityReportPage = lazy(() => import('../features/reports/pages/UserActivityReportPage'));
const ThaaliCostReportPage = lazy(() => import('../features/reports/pages/ThaaliCostReportPage'));
const CompanySettingsPage = lazy(() => import('../features/settings/pages/CompanySettingsPage'));
const ApprovalMatrixPage = lazy(() => import('../features/settings/pages/ApprovalMatrixPage'));
const SystemSettingsPage = lazy(() => import('../features/settings/pages/SystemSettingsPage'));

function SuspenseFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/profile" element={<ProfilePage />}>
              <Route index element={<ProfileOverviewPage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route path="sessions" element={<SessionsPage />} />
            </Route>

            <Route path="/masters/categories" element={<CategoriesPage />} />
            <Route path="/masters/units" element={<UnitsPage />} />
            <Route path="/masters/taxes" element={<TaxesPage />} />
            <Route path="/masters/payment-terms" element={<PaymentTermsPage />} />
            <Route path="/masters/thaali-budgets" element={<ThaaliBudgetsPage />} />
            <Route path="/masters/stores" element={<StoresPage />} />
            <Route path="/masters/items" element={<ItemsListPage />} />
            <Route path="/masters/vendors" element={<VendorsListPage />} />
            <Route path="/masters/vendors/:id" element={<VendorDetailPage />} />

            <Route path="/procurement/requisitions" element={<RequisitionsListPage />} />
            <Route path="/procurement/purchase-orders" element={<PurchaseOrdersListPage />} />
            <Route path="/procurement/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />

            <Route path="/inventory/grns" element={<GrnsListPage />} />
            <Route path="/inventory/current-stock" element={<InventoryReportPage />} />
            <Route path="/inventory/stock-ledger" element={<StockLedgerPage />} />
            <Route path="/inventory/reorder-alerts" element={<ReorderAlertsPage />} />
            <Route path="/inventory/adjustments" element={<AdjustmentsListPage />} />
            <Route path="/inventory/transfers" element={<TransfersListPage />} />
            <Route path="/inventory/debit-notes" element={<DebitNotesListPage />} />
            <Route path="/inventory/credit-notes" element={<CreditNotesListPage />} />
            <Route path="/inventory/stock-returns" element={<StockReturnsListPage />} />
            <Route path="/inventory/material-issues" element={<MaterialIssueVouchersListPage />} />

            <Route path="/invoices" element={<InvoicesListPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />

            <Route path="/finance/payment-vouchers" element={<PaymentVouchersListPage />} />
            <Route path="/finance/payments" element={<PaymentsListPage />} />
            <Route path="/finance/advance-payments" element={<AdvancePaymentsListPage />} />
            <Route path="/finance/vendor-ledger" element={<VendorLedgerPage />} />
            <Route path="/finance/expenses" element={<ExpensesListPage />} />

            <Route path="/notifications" element={<NotificationsPage />} />

            <Route path="/reports/purchases" element={<PurchaseReportPage />} />
            <Route path="/reports/vendors" element={<VendorReportPage />} />
            <Route path="/reports/inventory" element={<InventoryReportPage />} />
            <Route path="/reports/stock-ledger" element={<StockLedgerReportPage />} />
            <Route path="/reports/payments" element={<PaymentReportPage />} />
            <Route path="/reports/audit" element={<AuditReportPage />} />
            <Route path="/reports/user-activity" element={<UserActivityReportPage />} />
            <Route path="/reports/thaali-cost" element={<ThaaliCostReportPage />} />

            <Route path="/settings/company" element={<CompanySettingsPage />} />
            <Route path="/settings/approval-matrix" element={<ApprovalMatrixPage />} />
            <Route path="/settings/system" element={<SystemSettingsPage />} />

            <Route path="/admin/users" element={<UsersListPage />} />
            <Route path="/admin/roles" element={<RolesListPage />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
