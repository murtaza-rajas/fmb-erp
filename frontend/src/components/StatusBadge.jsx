import { Chip } from '@mui/material';

// Every status enum across the app (PO, PRN, invoice match/hold, approval,
// note, transfer...) maps here so a given status word always renders with
// the same color everywhere it appears.
const STATUS_COLOR_MAP = {
  // generic
  draft: 'default',
  submitted: 'info',
  active: 'success',
  inactive: 'default',
  cancelled: 'error',
  open: 'warning',
  settled: 'success',
  completed: 'success',
  pending: 'warning',
  in_transit: 'info',
  // PO lifecycle
  issued: 'info',
  partially_received: 'warning',
  received: 'info',
  invoiced: 'info',
  payment_pending: 'warning',
  paid: 'success',
  closed: 'success',
  converted_to_po: 'success',
  // invoice matching
  matched: 'success',
  mismatched: 'error',
  overridden: 'secondary',
  none: 'default',
  on_hold: 'warning',
  released: 'success',
  // approval
  approved: 'success',
  rejected: 'error',
};

function formatLabel(status) {
  return String(status)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function StatusBadge({ status, ...rest }) {
  const color = STATUS_COLOR_MAP[status] || 'default';
  return <Chip label={formatLabel(status)} color={color} size="small" variant={color === 'default' ? 'outlined' : 'filled'} {...rest} />;
}
