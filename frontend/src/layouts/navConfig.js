import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import BarChartIcon from '@mui/icons-material/BarChartOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';

// Single source of truth for the sidebar — each item's `permission` (if any)
// is checked with usePermission before rendering, so a role that lacks it
// simply doesn't see that link (server-side authorize() is still the real
// gate; this is presentation only).
export const navConfig = [
  { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
  { label: 'Notifications', path: '/notifications', icon: NotificationsOutlinedIcon },
  {
    label: 'Masters',
    icon: InventoryIcon,
    permission: 'master:read',
    children: [
      { label: 'Items', path: '/masters/items' },
      { label: 'Categories', path: '/masters/categories' },
      { label: 'Units', path: '/masters/units' },
      { label: 'Taxes', path: '/masters/taxes' },
      { label: 'Payment Terms', path: '/masters/payment-terms' },
      { label: 'Stores', path: '/masters/stores' },
      { label: 'Vendors', path: '/masters/vendors' },
      { label: 'Thaali Budgets', path: '/masters/thaali-budgets' },
    ],
  },
  {
    label: 'Procurement',
    icon: ShoppingCartIcon,
    permission: ['prn:read', 'po:read'],
    children: [
      { label: 'Requisitions', path: '/procurement/requisitions', permission: 'prn:read' },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders', permission: 'po:read' },
    ],
  },
  {
    label: 'Inventory',
    icon: WarehouseIcon,
    permission: 'stock:read',
    children: [
      { label: 'Goods Receipt (GRN)', path: '/inventory/grns' },
      { label: 'Current Stock', path: '/inventory/current-stock' },
      { label: 'Stock Ledger', path: '/inventory/stock-ledger' },
      { label: 'Adjustments', path: '/inventory/adjustments' },
      { label: 'Transfers', path: '/inventory/transfers' },
      { label: 'Stock Returns', path: '/inventory/stock-returns' },
      { label: 'Material Issues', path: '/inventory/material-issues' },
      { label: 'Debit Notes', path: '/inventory/debit-notes' },
      { label: 'Credit Notes', path: '/inventory/credit-notes' },
      { label: 'Reorder Alerts', path: '/inventory/reorder-alerts' },
    ],
  },
  {
    label: 'Invoices',
    icon: ReceiptLongIcon,
    permission: 'invoice:read',
    children: [{ label: 'Vendor Invoices', path: '/invoices' }],
  },
  {
    label: 'Finance',
    icon: AccountBalanceIcon,
    permission: ['payment_voucher:read', 'payment:read', 'expense:read'],
    children: [
      { label: 'Payment Vouchers', path: '/finance/payment-vouchers', permission: 'payment_voucher:read' },
      { label: 'Payments', path: '/finance/payments', permission: 'payment:read' },
      { label: 'Advance Payments', path: '/finance/advance-payments', permission: 'payment:read' },
      { label: 'Vendor Ledger', path: '/finance/vendor-ledger', permission: 'vendor_ledger:read' },
      { label: 'Expenses', path: '/finance/expenses', permission: 'expense:read' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChartIcon,
    permission: 'report:read',
    children: [
      { label: 'Purchases', path: '/reports/purchases' },
      { label: 'Vendors', path: '/reports/vendors' },
      { label: 'Inventory', path: '/reports/inventory' },
      { label: 'Stock Ledger', path: '/reports/stock-ledger' },
      { label: 'Payments', path: '/reports/payments' },
      { label: 'Audit Log', path: '/reports/audit' },
      { label: 'User Activity', path: '/reports/user-activity' },
      { label: 'Thaali Cost', path: '/reports/thaali-cost' },
    ],
  },
  {
    label: 'Administration',
    icon: PeopleIcon,
    permission: ['user:read', 'role:read'],
    children: [
      { label: 'Users', path: '/admin/users', permission: 'user:read' },
      { label: 'Roles & Permissions', path: '/admin/roles', permission: 'role:read' },
    ],
  },
  {
    label: 'Settings',
    icon: SettingsIcon,
    permission: 'settings:read',
    children: [
      { label: 'Company', path: '/settings/company' },
      { label: 'Approval Matrix', path: '/settings/approval-matrix' },
      { label: 'System', path: '/settings/system' },
    ],
  },
];
