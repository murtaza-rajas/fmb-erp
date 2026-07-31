# FMB ERP — Entity Relationship Diagram

Generated from the actual Mongoose schemas in `backend/src/models/*.model.js`. Regenerate/update this
whenever a model's fields or `ref`s change — treat drift here as a bug, not a doc nit.

## Core masters

```mermaid
erDiagram
    CATEGORY ||--o{ CATEGORY : "parentCategoryId"
    CATEGORY ||--o{ ITEM : categorizes
    UNIT ||--o{ UNIT : "baseUnitId"
    UNIT ||--o{ ITEM : "unitId"
    TAX ||--o{ ITEM : "taxId (optional)"
    ITEM {
        string sku UK
        string name
        ObjectId categoryId FK
        ObjectId unitId FK
        ObjectId taxId FK "optional"
        number reorderLevel
        number standardRate
    }
    STORE ||--o{ USER : "storeId (optional)"
    STORE ||--o{ USER : "responsiblePersonId (User, optional)"
    ROLE ||--o{ USER : "roleId"
    ROLE }o--o{ PERMISSION : "permissions[]"
    PAYMENT_TERM ||--o{ VENDOR : "paymentTermsId (optional)"
    VENDOR }o--o{ ITEM : "itemsSupplied[]"
```

**No `Department` master.** The SOP's Section 4 ("Master data required") lists exactly three masters —
Item, Vendor, Store/location. An earlier pass added an optional `Department` master + `User.departmentId`
as generic org-chart convenience; it was removed since nothing in the actual workflow (approvals,
permissions, reports) ever read it, and it wasn't SOP-mandated. Don't re-add it without a concrete
requirement driving it — the SOP's "teams" (Store, Procurement head, Purchase, Finance & HR) are roles
in the workflow, not a master data table.

**`Vendor` fields are scoped exactly to the SOP's Section 4 row**: "Vendor name, contact, items
supplied, agreed rates, payment terms, bank details" → `name`, `contactPerson`/`phone`/`email`,
`itemsSupplied[]`, `VendorItemRate` (separate model), `paymentTermsId`, `VendorBankAccount` (separate
model). An earlier pass added `address`, `gstin`, `panNumber`, and a `status`
(active/inactive/blacklisted) enum — none SOP-mandated, none load-bearing in any business logic — and
they were removed. Don't re-add them without a concrete requirement; if GST/PAN compliance becomes an
actual requirement later, note the SOP's Step 6 TDS check would be the textual hook to justify it, not
"real ERPs usually have this."

**Schema field existing ≠ field usable.** `itemsSupplied[]` was present on the model/validator from the
start but had no frontend field anywhere to actually set or view it — a real gap despite the field
"existing." Fixed by extending `FormAutocomplete.jsx` with a `multiple` mode and wiring it into
`VendorFormDialog.jsx` + displaying it as chips on `VendorDetailPage.jsx`'s Overview tab. When
auditing a model against a spec, check the frontend actually exposes every required field, not just
that the Mongoose schema has it.

## Procurement chain (PRN → PO → GRN)

```mermaid
erDiagram
    STORE ||--o{ PURCHASE_REQUISITION : "storeId"
    USER ||--o{ PURCHASE_REQUISITION : "requestedBy"
    ITEM ||--o{ PURCHASE_REQUISITION : "items[].itemId"
    PURCHASE_REQUISITION ||--o| PURCHASE_ORDER : "prnId"
    VENDOR ||--o{ PURCHASE_ORDER : "vendorId"
    ITEM ||--o{ PURCHASE_ORDER : "items[].itemId"
    TAX ||--o{ PURCHASE_ORDER : "items[].taxId (optional)"
    USER ||--o{ PURCHASE_ORDER : "issuedBy"
    PURCHASE_ORDER ||--o{ PURCHASE_ORDER : "parentPoId (revision chain)"
    PURCHASE_ORDER ||--o{ PO_STATUS_HISTORY : "poId"
    USER ||--o{ PO_STATUS_HISTORY : "changedBy"
    PURCHASE_ORDER ||--o{ GRN : "poId"
    STORE ||--o{ GRN : "storeId"
    ITEM ||--o{ GRN : "items[].itemId"
    USER ||--o{ GRN : "receivedBy"
    USER ||--o{ GRN : "items[].uploadedBy (rejection evidence)"

    PURCHASE_REQUISITION {
        string prnNumber UK
        string status "submitted|approved|rejected|converted"
    }
    PURCHASE_ORDER {
        string poNumber UK
        string status "draft|issued|partially_received|received|invoiced|payment_pending|paid|closed"
        number totalAmount
    }
    GRN {
        string grnNumber UK
        string qualityCheckStatus "pending|passed|failed"
    }
```

**No PO-approval step**: `PurchaseOrder` goes `draft → issued` directly (Procurement Head issues, no
separate approver role) — this is a deliberate SOP decision, not a missing feature. See [[project-architecture-decisions]] memory.

## Invoice matching → Finance chain

```mermaid
erDiagram
    VENDOR ||--o{ VENDOR_INVOICE : "vendorId"
    PURCHASE_ORDER ||--o{ VENDOR_INVOICE : "poId"
    GRN ||--o{ VENDOR_INVOICE : "grnId"
    ITEM ||--o{ VENDOR_INVOICE : "items[].itemId"
    VENDOR_INVOICE ||--o{ INVOICE_MATCH_LOG : "invoiceId"
    PURCHASE_ORDER ||--o{ INVOICE_MATCH_LOG : "poId"
    GRN ||--o{ INVOICE_MATCH_LOG : "grnId"
    ITEM ||--o{ INVOICE_MATCH_LOG : "itemId (per-field mismatch)"
    USER ||--o{ INVOICE_MATCH_LOG : "matchedBy"

    VENDOR_INVOICE ||--o| PAYMENT_VOUCHER : "invoiceId (1:1 once raised)"
    VENDOR ||--o{ PAYMENT_VOUCHER : "vendorId"
    USER ||--o{ PAYMENT_VOUCHER : "approvedBy"
    PAYMENT_VOUCHER ||--o| PAYMENT : "voucherId (1:1, unique)"
    USER ||--o{ PAYMENT : "paidBy"
    VENDOR ||--o{ ADVANCE_PAYMENT : "vendorId"
    VENDOR_INVOICE ||--o| ADVANCE_PAYMENT : "adjustedAgainstInvoiceId (optional)"
    USER ||--o{ VENDOR_INVOICE : "matchOverriddenBy (optional)"
    PAYMENT_VOUCHER ||--o{ DEBIT_NOTE : "waivedByVoucherId (optional, see Inventory section)"

    VENDOR_INVOICE {
        string invoiceNumber "vendor's own number, not auto-generated"
        string matchStatus "pending|matched|mismatched|overridden"
        string holdStatus "none|held"
        string matchOverrideReason "set only via override-match"
        ObjectId matchOverriddenBy FK "optional, User"
    }
    PAYMENT_VOUCHER {
        string voucherNumber UK
        string approvalStatus "pending|approved|rejected"
        string paymentMode
    }
```

**Single payment-approval gate**: `PaymentVoucher.approvalStatus` is the *only* approval step in the
whole payment flow, and it is hard-restricted to `staffType: 'paid'` users at three separate points
(role assignment, role permission update, and the approval action itself) — never to "Khidmat Gujar"
staff. See [[project-org-context]] memory. A `Payment` cannot exist without an `approved` voucher, which
cannot exist without a `matched` (or `overridden`, see below) `VendorInvoice`, which cannot exist
without a linked `PurchaseOrder` + `Grn` — so the DB structure itself enforces "no payment without
matched PO+GRN+Invoice."

**Match override (`overridden`) — a documented exception, not a bypass**: the auto three-way match
(`vendorInvoice.service.js#matchInvoice`) compares the invoice quantity against the GRN's accepted
`receivedQty` only (never `rejectedQty`), so a vendor who bills for the *full* ordered quantity despite
some goods being rejected as damaged at GRN will always come back `mismatched` — this is intentional,
not a bug. `overrideMatch` (Purchase-only, `invoice:override_match` permission) lets that specific,
known discrepancy be manually accepted with a mandatory reason, moving the invoice to a distinct
`overridden` status (never silently reused as `matched`, so reports/audit can always tell an
auto-cleared match from a manually-accepted one) and unblocking `PaymentVoucher` creation exactly like a
clean match would. The reason is stored both on `VendorInvoice.matchOverrideReason` and as a `reason` on
the `overridden` `InvoiceMatchLog` entry (which also carries forward the original discrepancies, so the
override doesn't erase *why* it was needed). Added for the case of vendor terms that bill perishables in
full regardless of rejected quantity — see conversation history, not SOP-literal, confirmed with user
before implementing.

## Inventory adjustments / transfers / returns / notes

```mermaid
erDiagram
    ITEM ||--o{ STOCK_LEDGER : "itemId"
    STORE ||--o{ STOCK_LEDGER : "storeId"
    ITEM ||--o{ STOCK_ADJUSTMENT : "itemId"
    STORE ||--o{ STOCK_ADJUSTMENT : "storeId"
    USER ||--o{ STOCK_ADJUSTMENT : "approvedBy"
    ITEM ||--o{ STOCK_TRANSFER : "items[].itemId"
    STORE ||--o{ STOCK_TRANSFER : "fromStoreId"
    STORE ||--o{ STOCK_TRANSFER : "toStoreId"
    ITEM ||--o{ STOCK_RETURN : "items[].itemId"
    STORE ||--o{ STOCK_RETURN : "storeId"
    VENDOR ||--o{ STOCK_RETURN : "vendorId"
    DEBIT_NOTE ||--o| STOCK_RETURN : "linkedDnId (optional)"
    VENDOR ||--o{ DEBIT_NOTE : "vendorId"
    PURCHASE_ORDER ||--o{ DEBIT_NOTE : "poId (optional)"
    GRN ||--o{ DEBIT_NOTE : "grnId (optional)"
    ITEM ||--o{ DEBIT_NOTE : "itemId"
    USER ||--o{ DEBIT_NOTE : "uploadedBy"
    USER ||--o{ DEBIT_NOTE : "waivedBy (optional)"
    VENDOR ||--o{ CREDIT_NOTE : "vendorId"

    DEBIT_NOTE {
        string dnNumber UK
        number totalAmount
        string status "open|settled|waived"
        ObjectId waivedByVoucherId FK "optional, PaymentVoucher"
    }

    STOCK_LEDGER {
        string transactionType "grn_receipt|adjustment|transfer_out|transfer_in|return|..."
        string refType "polymorphic: PurchaseOrder|StockAdjustment|StockTransfer|StockReturn|..."
        ObjectId refId "polymorphic FK, not a real Mongoose ref"
        number quantity "signed: + in, - out"
        number balanceAfter
    }
```

**Debit note waiver (`waived`)**: a `DebitNote` is normally auto-created by `grn.service.js` whenever a
GRN line has `rejectedQty > 0`, and posts a debit (reduces payable) to the vendor ledger — the SOP's
"damaged goods excluded from payment" default. `waived` is the opt-out: settable *only* during
`PaymentVoucher` approval (`paymentVoucher.service.js#waiveDebitNote`, same transaction as the approval
itself), for when Finance decides to pay the vendor in full despite the rejection anyway. Waiving posts
a reversing credit ledger entry so the vendor ledger still nets to zero once payment is made — it does
not delete or hide the debit note, which stays visible with its original reason (`rejectionReason`,
`remarks`) plus `waivedBy`/`waivedAt`/`waivedByVoucherId` for who/when/why it was overridden. See the
match-override note above — the two features are usually used together (override the invoice match,
then waive the debit note it was raised against) but are independent: a debit note can be waived without
any invoice ever having mismatched, and an override doesn't require waiving anything.

**Polymorphic refs — not real foreign keys**: `StockLedger.refId`/`refType` and
`VendorLedgerEntry.refId`/`refType` are a manual polymorphic-association pattern (a plain `ObjectId`
with no `ref:`, disambiguated by a sibling `refType` string). Mongoose can't `.populate()` these
directly — the repository layer switches on `refType` to resolve them. Don't add a `ref:` to these
fields; the pattern is deliberate, mirroring how the audit trail needs to point at many different
collections from one ledger table. `VendorLedgerEntry` itself (debit/credit/balanceAfter per vendor,
driving the Vendor Ledger page) is populated by invoice/payment/debit-note events the same way
`StockLedger` is populated by GRN/adjustment/transfer/return events.

## Auth, RBAC, and cross-cutting

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : "userId"
    REFRESH_TOKEN ||--o{ REFRESH_TOKEN : "replacedByTokenId (rotation chain)"
    USER ||--o{ PASSWORD_RESET_TOKEN : "userId"
    USER ||--o{ LOGIN_HISTORY : "userId"
    USER ||--o{ DEVICE_TOKEN : "userId (FCM push)"
    USER ||--o{ NOTIFICATION : "userId"
    USER ||--o{ AUDIT_LOG : "userId (optional, system actions have none)"
    ROLE ||--o{ APPROVAL_MATRIX_ENTRY : "requiredApproverRoleId"
```

`CompanySettings` and `SystemSettings` are both **singletons** (get-or-create on first read, no `ref`s
in or out) — not shown above since they have no relationships.

## Auto-generated document numbers

`poNumber`, `prnNumber`, `grnNumber`, `dnNumber`, `cnNumber`, `voucherNumber` are all generated via the
shared `Counter` model (`key` + atomic `$inc` on `seq`), not by any per-model logic — one counter
document per number series, keyed by a string like `'PO-2026'`.
