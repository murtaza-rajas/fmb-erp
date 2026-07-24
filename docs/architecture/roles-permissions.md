# FMB ERP — Roles & Permission Matrix

Permissions are never hardcoded into route/controller logic — every check is `hasPermission(user, 'module:action')` against the user's role's `permissions` array (see `roles` / `permissions` collections in `database-schema.md`). The matrix below is the **seed data**, not a hardcoded rule set — Super Admin can adjust non-system permissions per role at runtime, subject to the staffType gate below.

## Roles (seeded, `isSystemRole: true`)

| Role | SOP function | Notes |
|---|---|---|
| Store | Stock monitoring, PRN, GRN, quality/qty check | Scoped to their assigned `storeId` |
| Procurement Head | Create & issue PO, vendor selection, quotation comparison | No approval step needed to issue |
| Purchase | Vendor invoice matching (3-way match) | |
| Finance & HR | Payment approval, vendor ledger, payment processing | **Only role permitted `payment_voucher:approve`**, and only for users with `staffType: 'paid'` |
| Super Admin | Full system access: users, roles, permissions, settings | Platform-level, not part of the SOP flow |
| Auditor | Read-only access to all modules + audit/activity logs | No create/update/delete/approve permissions on any module |

## Permission keys (seed set, `module:action` convention)

| Module | Actions |
|---|---|
| `user` | `create`, `read`, `update`, `delete`, `manage_roles` |
| `role` | `create`, `read`, `update`, `delete` |
| `master` (item/category/unit/tax/vendor/store/payment_terms) | `create`, `read`, `update`, `delete` |
| `prn` | `create`, `read`, `update`, `cancel` |
| `po` | `create`, `read`, `update`, `revise`, `cancel`, `print`, `email` |
| `grn` | `create`, `read`, `update` |
| `stock` | `read`, `adjust`, `transfer`, `return` |
| `debit_note` / `credit_note` | `create`, `read`, `update` |
| `invoice` | `create`, `read`, `match`, `hold`, `release` |
| `payment_voucher` | `create`, `read`, `approve` ← **staffType-gated**, `reject` |
| `payment` | `create`, `read` |
| `vendor_ledger` | `read` |
| `report` | `read`, `export` |
| `audit_log` / `activity_log` | `read` |
| `settings` | `read`, `update` |

## Default role → permission grants

| Permission | Store | Procurement Head | Purchase | Finance & HR | Super Admin | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `prn:create/read/update` | ✅ | — | — | — | ✅ | read |
| `po:create/read/update/revise/cancel/print/email` | read | ✅ | read | read | ✅ | read |
| `grn:create/read/update` | ✅ | read | read | read | ✅ | read |
| `stock:read/adjust/transfer/return` | ✅ | read | read | read | ✅ | read |
| `debit_note:*` / `credit_note:*` | ✅ (create on rejection) | read | ✅ | ✅ | ✅ | read |
| `invoice:create/read/match/hold/release` | — | read | ✅ | ✅ | ✅ | read |
| `payment_voucher:create/read` | — | — | read | ✅ | ✅ | read |
| `payment_voucher:approve` | — | — | — | ✅ **(paid staff only)** | ✅ **(paid staff only)** | — |
| `payment:create/read` | — | — | — | ✅ | ✅ | read |
| `vendor_ledger:read` | — | read | read | ✅ | ✅ | read |
| `master:*` | read | ✅ (vendor/item) | read | read (payment_terms) | ✅ | read |
| `user:*` / `role:*` | — | — | — | — | ✅ | read |
| `report:read/export` | own-store scope | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit_log:read` / `activity_log:read` | — | — | — | — | ✅ | ✅ |
| `settings:*` | — | — | — | — | ✅ | read |

## The staffType hard gate

`payment_voucher:approve` carries `isPaymentApprovalGate: true` on the `permissions` document. Enforcement points (all in the service layer, not just UI hiding):

1. **User creation/update** (`UserService.assignRole`): if the target role's permission set includes any `isPaymentApprovalGate` permission, reject unless `user.staffType === 'paid'`.
2. **Role permission update** (`RoleService.updatePermissions`): if a Super Admin adds a gated permission to a role, and that role already has members with `staffType: 'khidmat_gujar'`, reject the update (or require removing those members from the role first) — the system must never end up in a state where a khidmat_gujar user effectively holds payment-approval rights.
3. **Payment voucher approval action** (`PaymentVoucherService.approve`): re-validate `req.user.staffType === 'paid'` at the point of approval as defense-in-depth, even though route-level permission check already passed.

This is a genuine business/organizational constraint from the SOP ("Access to payment approval should be restricted to paid staff roles"), not a generic RBAC nicety — it must survive misconfiguration by an admin, not just reflect the default seed.
