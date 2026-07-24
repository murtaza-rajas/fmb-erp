# FMB ERP — Database Schema (MongoDB / Mongoose)

Source of truth: `FMB_Procurement_Payment_SOP.docx` (v1.0) + confirmed architecture decisions (see below). This document defines every collection, its fields, indexes, and relationships.

## Conventions applied to every collection

Unless noted otherwise, every schema includes:

```
createdBy:   { type: ObjectId, ref: 'User' }
updatedBy:   { type: ObjectId, ref: 'User' }
isDeleted:   { type: Boolean, default: false }        // soft delete
deletedAt:   { type: Date }
deletedBy:   { type: ObjectId, ref: 'User' }
status:      { type: String, enum: [...], default: <first-state> }
timestamps: true   // createdAt / updatedAt via Mongoose option
```

All queries in repositories filter `isDeleted: false` by default. All collections carry a compound index on `{ isDeleted: 1, status: 1 }` at minimum, plus the specific indexes listed per collection.

Confirmed decisions this schema encodes (see project memory `project-architecture-decisions`):
- Roles: Store, Procurement Head, Purchase, Finance & HR, Super Admin, Auditor.
- No PR/PO approval step — only Payment approval.
- `staffType` hard gate on User (paid vs khidmat_gujar) enforced at the service layer for payment-approval permission grants.
- Category, Unit, Tax, Payment Terms, Bank are normalized master collections.
- **Mobile-ready**: push notifications via Firebase Cloud Messaging (`device_tokens` collection below), file attachments (invoice scans, GRN/damaged-goods photos) via presigned direct-to-S3 upload — API stores only the resulting `fileKey`, never handles the binary.

---

## 1. Identity & Access

### `users`
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | required, unique, lowercase, indexed |
| phone | String | optional, indexed |
| passwordHash | String | bcrypt, `select: false` |
| roleId | ObjectId → `roles` | required, indexed |
| storeId | ObjectId → `stores` | for Store-role users tied to one location |
| staffType | String enum `['paid', 'khidmat_gujar']` | required — hard gate, see below |
| status | String enum `['active','inactive','locked']` | default `active` |
| isEmailVerified | Boolean | default false |
| avatarUrl | String | |
| lastLoginAt | Date | |
| mustChangePassword | Boolean | default false, set after admin-reset |

**Indexes:** `{ email: 1 }` unique, `{ roleId: 1, status: 1 }`, `{ staffType: 1 }`.

**Service-layer invariant (not a DB constraint):** before assigning a role/permission set that includes `payment:approve` (or `payment_voucher:approve`) to a user, `UserService` must verify `staffType === 'paid'`; reject with a domain error otherwise. This must be re-checked on both user creation and role change, not just at role-definition time, since a role's permission set can change later.

### `roles`
| Field | Type | Notes |
|---|---|---|
| name | String | unique — `Store`, `Procurement Head`, `Purchase`, `Finance & HR`, `Super Admin`, `Auditor` (seed data) plus any custom roles created later |
| description | String | |
| isSystemRole | Boolean | true for the 6 seeded roles — blocks deletion |
| permissions | [ObjectId → `permissions`] | |

**Indexes:** `{ name: 1 }` unique.

### `permissions`
| Field | Type | Notes |
|---|---|---|
| key | String | unique, e.g. `payment_voucher:approve`, `po:create`, `grn:create` — `module:action` convention |
| module | String | e.g. `procurement`, `inventory`, `finance` |
| action | String | e.g. `create`, `read`, `update`, `delete`, `approve`, `export` |
| description | String | |
| isPaymentApprovalGate | Boolean | default false; set true only on `payment_voucher:approve` — flags the permission the staffType guard checks for |

**Indexes:** `{ key: 1 }` unique, `{ module: 1 }`.

### `refresh_tokens`
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → `users` | indexed |
| tokenHash | String | never store raw token |
| deviceInfo | String | UA string |
| ip | String | |
| expiresAt | Date | TTL indexed |
| revokedAt | Date | set on logout/rotation |
| replacedByTokenId | ObjectId | for rotation chain |

**Indexes:** `{ userId: 1 }`, `{ expiresAt: 1 }` TTL.

### `login_history`
`userId`, `ip`, `userAgent`, `success` (Boolean), `failureReason`, `timestamp` — append-only, no soft delete needed (retain for audit).

### `otps`
`identifier` (email/phone), `codeHash`, `purpose` enum `['login','password_reset','email_verify']`, `expiresAt` (TTL), `consumedAt`, `attempts`.

### `password_reset_tokens`
`userId`, `tokenHash`, `expiresAt` (TTL), `usedAt`.

### `device_tokens`
Registers a device for push notifications — a user can have several (phone + tablet + web), and a device is re-registered (upserted) on every login/app-open so stale tokens don't accumulate:

| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → `users` | required, indexed |
| deviceId | String | client-generated stable device identifier |
| fcmToken | String | Firebase Cloud Messaging registration token |
| platform | enum `['android','ios','web']` | |
| lastUsedAt | Date | updated on each successful push or re-registration |
| isActive | Boolean | set false when FCM reports the token as invalid/unregistered, instead of deleting immediately |

**Indexes:** `{ userId: 1, deviceId: 1 }` unique (upsert target), `{ fcmToken: 1 }`.

**Note:** this is additive to the existing `refresh_tokens` per-device session model — a device has one refresh-token session and one device-token push registration, linked by the same `deviceId` where the client supplies one, but tracked as separate concerns (auth session vs. push addressability) since a push token can outlive a login session.

---

## 2. Master Data

### `categories`
`name`, `parentCategoryId` (ObjectId, self-ref, optional — supports subcategories), `description`.

### `units` (Unit of Measure)
`name` (e.g. "Kilogram"), `symbol` (e.g. "kg"), `baseUnitId` (ObjectId self-ref, optional), `conversionFactor` (Number, relative to base unit).

### `taxes`
`name` (e.g. "GST 18%"), `rate` (Number, percentage), `type` enum `['GST','VAT','CESS','NONE']`, `isDefault` (Boolean).

### `payment_terms`
`name` (e.g. "Net 30"), `days` (Number), `description`.

### `banks`
Bank *master* (bank names/IFSC lookup, optional convenience list) — kept separate from vendor bank accounts:
`name`, `ifscPrefix`, `branchList` (light reference list). This is optional/low-priority; the operative record is `vendor_bank_accounts` below.

### `stores`
| Field | Type | Notes |
|---|---|---|
| name | String | required, unique |
| address | String | |
| responsiblePersonId | ObjectId → `users` | |
| contact | String | |
| isDefault | Boolean | |

### `items` (Item master)
| Field | Type | Notes |
|---|---|---|
| name | String | required, indexed |
| sku | String | unique, indexed — auto-generated or manual |
| categoryId | ObjectId → `categories` | required |
| unitId | ObjectId → `units` | required |
| reorderLevel | Number | required — triggers low-stock alerts |
| standardRate | Number | reference rate, not vendor-specific |
| taxId | ObjectId → `taxes` | |
| barcodeValue | String | for barcode/QR scanning |
| isActive | Boolean | default true |

**Indexes:** `{ sku: 1 }` unique, `{ name: 'text' }` for search, `{ categoryId: 1 }`.

### `vendors` (Vendor master)
| Field | Type | Notes |
|---|---|---|
| name | String | required, indexed |
| contactPerson | String | |
| phone | String | |
| email | String | |
| paymentTermsId | ObjectId → `payment_terms` | |
| itemsSupplied | [ObjectId → `items`] | denormalized quick-list; authoritative rates live in `vendor_item_rates` |

**Indexes:** `{ name: 'text' }`.

### `vendor_bank_accounts`
`vendorId` (ObjectId → `vendors`), `accountHolderName`, `bankName`, `accountNumber`, `ifsc`, `isPrimary` (Boolean).

### `vendor_item_rates`
Rate history/quotation record: `vendorId`, `itemId`, `rate`, `effectiveFrom` (Date), `effectiveTo` (Date, null = current), `quotationRef`. Used for quotation comparison during PO creation.

**Indexes:** `{ vendorId: 1, itemId: 1, effectiveFrom: -1 }`.

---

## 3. Procurement

### `purchase_requisitions` (PRN)
| Field | Type | Notes |
|---|---|---|
| prnNumber | String | unique, auto-generated (e.g. `PRN-2026-00042`) |
| storeId | ObjectId → `stores` | required |
| requestedBy | ObjectId → `users` | required |
| items | [{ itemId, quantity, neededByDate, reason }] | embedded array |
| isEmergency | Boolean | default false — flags retrospective PRN per SOP exception |
| status | enum `['draft','submitted','converted_to_po','cancelled']` | no approval state — SOP has no PR sign-off |

**Indexes:** `{ prnNumber: 1 }` unique, `{ storeId: 1, status: 1 }`.

### `purchase_orders`
| Field | Type | Notes |
|---|---|---|
| poNumber | String | unique, auto-generated |
| prnId | ObjectId → `purchase_requisitions` | required (except emergency retrospective flow, still required within 24h per SOP) |
| vendorId | ObjectId → `vendors` | required |
| items | [{ itemId, quantity, rate, taxId, amount }] | embedded |
| totalAmount | Number | computed from items |
| status | enum `['draft','issued','partially_received','received','invoiced','payment_pending','paid','closed','cancelled']` | matches SOP lifecycle exactly, plus `cancelled` |
| issuedBy | ObjectId → `users` | Procurement Head who issued it |
| issuedAt | Date | |
| revisionNumber | Number | default 0 |
| parentPoId | ObjectId → `purchase_orders` | set when this doc is a revision of an earlier PO |
| emailSentAt | Date | when PO was emailed to vendor |

**Indexes:** `{ poNumber: 1 }` unique, `{ vendorId: 1, status: 1 }`, `{ status: 1 }`.

### `po_status_history` (timeline)
Append-only: `poId`, `fromStatus`, `toStatus`, `changedBy`, `remarks`, `timestamp`. Powers the "PO Timeline" UI feature without overloading the PO document itself.

---

## 4. Inventory

### `grns` (Goods Receipt Note)
| Field | Type | Notes |
|---|---|---|
| grnNumber | String | unique, auto-generated |
| poId | ObjectId → `purchase_orders` | required |
| storeId | ObjectId → `stores` | required |
| items | [{ itemId, orderedQty, receivedQty, rejectedQty, remarks }] | rejectedQty > 0 triggers a linked debit note |
| qualityCheckStatus | enum `['pending','passed','failed_partial']` | |
| receivedBy | ObjectId → `users` | |
| isPartial | Boolean | true when receivedQty < orderedQty across any line |
| attachments | [{ fileKey, contentType, uploadedBy, uploadedAt }] | photos of received/damaged goods, captured on mobile and uploaded directly to S3 via presigned URL (see `api-design.md` § Uploads) — API stores only the returned `fileKey` |

**Indexes:** `{ grnNumber: 1 }` unique, `{ poId: 1 }`.

**Side effect (service layer, transactional):** creating a GRN writes matching `stock_ledger` entries (qty += receivedQty) and updates PO status to `partially_received` or `received` in the same MongoDB transaction.

### `stock_ledger`
Append-only ledger — never updated in place, only inserted:
| Field | Type | Notes |
|---|---|---|
| itemId | ObjectId → `items` | required |
| storeId | ObjectId → `stores` | required |
| transactionType | enum `['grn_in','issue_out','adjustment','transfer_in','transfer_out','return_out']` | |
| refType / refId | String / ObjectId | polymorphic ref to the source doc (GRN, adjustment, transfer, DN) |
| quantity | Number | signed (+ in, − out) |
| balanceAfter | Number | running balance for that item+store, computed at write time |
| timestamp | Date | |

**Indexes:** `{ itemId: 1, storeId: 1, timestamp: -1 }` — this is the primary query path for stock ledger reports and current-balance lookups.

### `stock_adjustments`
`itemId`, `storeId`, `quantity` (signed), `reason`, `approvedBy` — a manual correction entry that also writes a `stock_ledger` row of type `adjustment`.

### `stock_transfers`
`fromStoreId`, `toStoreId`, `items` [{itemId, quantity}], `status` enum `['pending','in_transit','completed']` — writes `transfer_out` at source and `transfer_in` at destination on completion.

### `debit_notes`
| Field | Type | Notes |
|---|---|---|
| dnNumber | String | unique |
| vendorId | ObjectId → `vendors` | |
| poId / grnId | ObjectId refs | |
| items | [{ itemId, quantity, rate, amount, reason }] | reason: `damaged` \| `rejected` \| `short_supply` |
| totalAmount | Number | excluded from payment per SOP |
| status | enum `['open','settled']` | |
| attachments | [{ fileKey, contentType, uploadedBy, uploadedAt }] | evidence photos of damaged/rejected goods, same presigned-upload pattern as GRN (see `api-design.md` § Uploads) |

### `credit_notes`
Mirror of debit notes for vendor-side credits (e.g. price correction in FMB's favor): `cnNumber`, `vendorId`, `amount`, `reason`, `status`.

### `stock_returns`
`storeId`, `vendorId`, `items` [{itemId, quantity}], `linkedDnId` (ObjectId → `debit_notes`), `status` — SOP's "Stock Return" exception: issues a DN and adjusts the ledger (`return_out` entries).

---

## 5. Invoice & Matching

### `vendor_invoices`
| Field | Type | Notes |
|---|---|---|
| invoiceNumber | String | vendor's own invoice number, not auto-generated |
| vendorId | ObjectId → `vendors` | required |
| poId | ObjectId → `purchase_orders` | required |
| grnId | ObjectId → `grns` | required — enforces PO+GRN+Invoice presence at the schema level |
| items | [{ itemId, quantity, rate, amount }] | |
| totalAmount | Number | |
| fileKey | String | S3 object key of the uploaded scan/PDF — file itself goes straight from client (web or mobile) to S3 via presigned URL, API never touches the binary (see `api-design.md` § Uploads) |
| matchStatus | enum `['pending','matched','mismatched']` | |
| holdStatus | enum `['none','on_hold','released']` | SOP: "Hold Invoice" / "Release Invoice" |
| holdReason | String | |

**Indexes:** `{ poId: 1 }`, `{ vendorId: 1, matchStatus: 1 }`.

### `invoice_match_logs`
`invoiceId`, `poId`, `grnId`, `discrepancies` [{ field, poValue, grnValue, invoiceValue }], `matchedBy`, `matchedAt`, `result` enum `['matched','mismatched']`. Append-only record of each match attempt (an invoice can be re-matched after a correction).

---

## 6. Finance

### `payment_vouchers`
| Field | Type | Notes |
|---|---|---|
| voucherNumber | String | unique, auto-generated |
| invoiceId | ObjectId → `vendor_invoices` | required — cannot exist without a matched invoice |
| vendorId | ObjectId → `vendors` | required |
| amount | Number | |
| approvalStatus | enum `['pending','approved','rejected']` | the SOP's single approval gate |
| approvedBy | ObjectId → `users` | must resolve to a user with `staffType: 'paid'` — enforced at creation of this field, not just at role level |
| approvedAt | Date | |
| rejectionReason | String | |
| paymentMode | enum `['cheque','neft','rtgs','upi','cash']` | |

**Indexes:** `{ invoiceId: 1 }`, `{ vendorId: 1, approvalStatus: 1 }`.

### `payments`
`voucherId` (ObjectId → `payment_vouchers`), `transactionRef`, `paidAmount`, `paidAt`, `paidBy`, `paymentAdviceSentAt`. On insert (transaction): sets PO status to `paid` → `closed` and voucher status stays `approved`.

### `advance_payments`
`vendorId`, `amount`, `paidAt`, `adjustedAgainstInvoiceId` (nullable), `balanceRemaining` — for advance-payment tracking referenced in Finance's vendor-ledger review step.

### `vendor_ledger_entries`
Materialized ledger row per financial event (PO invoiced, payment made, debit/credit note, advance) rather than a live aggregation, for fast reporting:
`vendorId`, `entryType` enum `['invoice','payment','debit_note','credit_note','advance']`, `refId`, `debit`, `credit`, `balanceAfter`, `timestamp`.

**Indexes:** `{ vendorId: 1, timestamp: -1 }`.

---

## 7. Notifications & Audit

### `notifications`
`userId`, `type`, `title`, `message`, `link`, `channel` enum `['in_app','email','sms','push']`, `isRead` (Boolean), `sentAt`, `pushDeliveryStatus` (enum `['sent','failed','skipped']`, set when `channel: 'push'` — records the FCM send result per `device_tokens` entry so failed/invalid tokens can be flagged for cleanup).

### `audit_logs`
Immutable, system-wide: `userId`, `action` (e.g. `create`,`update`,`delete`,`approve`,`login`), `module`, `entityType`, `entityId`, `before` (JSON snapshot), `after` (JSON snapshot), `ip`, `timestamp`. Written by a shared audit middleware/service — never edited by feature code directly.

### `activity_logs`
Human-readable feed version of the same events, for the in-app "Activity Logs" screen: `userId`, `description`, `entityType`, `entityId`, `timestamp`.

---

## 8. Settings

### `company_settings` (singleton document)
`name`, `logoUrl`, `address`, `gstin`, `financialYearStartMonth`, `currency`.

### `approval_matrix`
Per SOP's exception clause ("emergency purchase ... still subject to approval matrix"), this exists for **compliance-checking emergency purchases retrospectively** — it is not a blocking gate on the normal PRN→PO flow (confirmed decision: no PR/PO approval step exists). Fields: `module` (`emergency_purchase`), `amountThreshold`, `requiredApproverRoleId`, `isActive`.

### `system_settings`
Email/SMS provider config, backup schedule, theme defaults — singleton or key/value.

---

## Cross-cutting relationship summary

```
PurchaseRequisition ──< PurchaseOrder >── Vendor
PurchaseOrder ──< GRN ──< StockLedger
PurchaseOrder ──< VendorInvoice >── GRN (three-way match: PO + GRN + Invoice)
VendorInvoice ── PaymentVoucher ── Payment
GRN (rejected items) ──> DebitNote
StockReturn ──> DebitNote, StockLedger
```

No `PaymentVoucher` may be created without a `VendorInvoice` whose `matchStatus = 'matched'`; this is enforced in `PaymentVoucherService`, not just referential integrity.
