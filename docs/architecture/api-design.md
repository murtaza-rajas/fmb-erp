# FMB ERP — API Design

Base path: `/api/v1`. Every endpoint (except `/auth/login`, `/auth/refresh`, `/auth/forgot-password`) requires a valid JWT access token. Authorization is `hasPermission('module:action')` middleware per route, layered on top of authentication.

**Client-agnostic by design**: this API serves the React web app and the future mobile app off the same contract — no server-rendered views, no web-only session cookies for auth (JWT bearer token works identically for both), and CORS is irrelevant to native mobile clients so it's scoped to the web app's origin only, not loosened for mobile. The mobile-specific additions below (push, presigned uploads, app-config) are additive endpoints, not a parallel API.

## Response envelope (all endpoints)

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 134 },
  "error": null
}
```

Errors:
```json
{ "success": false, "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

List endpoints accept `?page&limit&sort&search&filter[field]=value` uniformly via a shared `queryParser` middleware.

## Auth (`/auth`)
- `POST /login`
- `POST /refresh-token`
- `POST /logout`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /change-password` — authenticated, requires the current password (distinct from forgot/reset, which use an emailed token and don't need it)
- `POST /verify-otp`
- `POST /resend-otp`
- `GET /me`
- `GET /sessions` — active session/device list
- `DELETE /sessions/:id` — revoke a session

Mobile clients hit the same `/auth/login`, receive the same access + refresh token pair; the refresh token is tied to `deviceInfo`/`deviceId` exactly as it is for a browser session, so a phone and a laptop are just two rows in `refresh_tokens` — no separate mobile auth flow needed.

## Users & Access (`/users`, `/roles`, `/permissions`)
- `GET/POST /users`, `GET/PATCH/DELETE /users/:id`
- `PATCH /users/:id/status` (activate/deactivate/lock)
- `PATCH /users/:id/role` — triggers staffType gate check
- `GET/POST /roles`, `GET/PATCH/DELETE /roles/:id`
- `PATCH /roles/:id/permissions` — triggers staffType gate check
- `GET /permissions`
- `GET /users/:id/activity-log`

## Masters (`/masters/...`)
Each of the following follows the identical CRUD + list shape: `items`, `categories`, `units`, `taxes`, `vendors`, `stores`, `payment-terms`, `banks`.
- `GET /masters/items` (search, filter by category), `POST /masters/items`, `GET/PATCH/DELETE /masters/items/:id`
- `GET /masters/items/:id/low-stock-check`
- `GET /masters/vendors`, `POST /masters/vendors`, `GET/PATCH/DELETE /masters/vendors/:id`
- `GET/POST /masters/vendors/:id/bank-accounts`
- `GET/POST /masters/vendors/:id/item-rates` — rate/quotation history
- `GET/POST /masters/categories`, `/masters/units`, `/masters/taxes`, `/masters/payment-terms`, `/masters/stores`

## Procurement (`/procurement/...`)
- `GET/POST /procurement/requisitions`, `GET/PATCH /procurement/requisitions/:id`
- `PATCH /procurement/requisitions/:id/cancel`
- `GET/POST /procurement/purchase-orders`
- `GET /procurement/purchase-orders/:id`
- `POST /procurement/purchase-orders/:id/revise`
- `PATCH /procurement/purchase-orders/:id/cancel`
- `GET /procurement/purchase-orders/:id/timeline`
- `POST /procurement/purchase-orders/:id/send-email`
- `GET /procurement/purchase-orders/:id/print` — PDF stream
- `GET /procurement/vendors/:vendorId/quotation-comparison?items=...`

## Inventory (`/inventory/...`)
- `GET/POST /inventory/grns`, `GET /inventory/grns/:id`
- `GET /inventory/stock-ledger?itemId&storeId&from&to`
- `GET /inventory/stock-balance?itemId&storeId`
- `POST /inventory/adjustments`, `GET /inventory/adjustments`
- `POST /inventory/transfers`, `PATCH /inventory/transfers/:id/complete`
- `POST /inventory/stock-returns`
- `GET/POST /inventory/debit-notes`, `GET/POST /inventory/credit-notes`
- `GET /inventory/reorder-alerts`

## Invoice Matching (`/invoices/...`)
- `GET/POST /invoices` — `fileKey` (from the Uploads presign flow) carried in the body instead of a multipart upload
- `GET /invoices/:id`
- `POST /invoices/:id/match` — runs 3-way match (quantity vs. the GRN's actual receivedQty, rate vs. the PO's agreed rate) — re-runnable; each attempt appends a new `invoice_match_logs` entry rather than overwriting the last
- `GET /invoices/:id/match-history` — the append-only log of every match attempt
- `PATCH /invoices/:id/hold`, `PATCH /invoices/:id/release` — independent of matchStatus

## Finance (`/finance/...`)
- `GET/POST /finance/payment-vouchers` — creation hard-gated on `matchStatus === 'matched' && holdStatus !== 'on_hold'`
- `PATCH /finance/payment-vouchers/:id/approve` — staffType-gated (permission *and* a live re-check of the acting user's staffType)
- `PATCH /finance/payment-vouchers/:id/reject`
- `POST /finance/payments` — process payment against an approved voucher; transactional PO `payment_pending`→`paid`→`closed`
- `GET /finance/payments/:id/advice` — PDF payment advice
- `GET/POST /finance/advance-payments`, `PATCH /finance/advance-payments/:id/adjust`
- `GET /finance/vendor-ledger/:vendorId` — paginated ledger entries
- `GET /finance/vendor-ledger/outstanding-payments` — vendors with a positive outstanding payable balance

## Reports (`/reports/...`)
- `GET /reports/purchases`, `/reports/vendors`, `/reports/inventory`, `/reports/stock-ledger`, `/reports/payments`, `/reports/audit`, `/reports/user-activity`
- Each supports `?format=csv|excel|pdf` via the shared `utils/exportHelper.js`. Viewing JSON only requires `report:read`; any `?format=` requires `report:export` as well, checked in `routes/report.routes.js`.

## Notifications (`/notifications/...`)
- `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
- Real-time push over Socket.io namespace `/notifications` (server emits `notification:new`) — used while the web app or a foregrounded mobile app is connected.
- `POST /notifications/devices` — register/upsert a device's FCM token (`{ deviceId, fcmToken, platform }`), called on login and on app foreground. Upserts into `device_tokens` keyed on `{ userId, deviceId }`.
- `DELETE /notifications/devices/:deviceId` — deregister on logout, so a signed-out device stops receiving push.
- Delivery: `NotificationService.dispatch(userId, payload)` fans out to whichever channels are configured for that notification type — in-app (always), Socket.io (if connected), and **FCM push via Firebase Admin SDK** to every active `device_tokens` row for that user (covers backgrounded/closed mobile apps, which Socket.io cannot reach). A token FCM reports as invalid is marked `isActive: false` on `device_tokens` rather than deleted immediately, so cleanup can be audited.

## Uploads (`/uploads/...`)
Presigned direct-to-S3 upload — used for vendor invoice scans, GRN receiving photos, and debit-note damaged-goods evidence, all of which the mobile app captures via camera. The API never receives the file body:
- `POST /uploads/presign` — body `{ module: 'invoice'|'grn'|'debit_note', fileName, contentType }` → returns `{ uploadUrl, fileKey, expiresIn }`. `uploadUrl` is a short-lived (e.g. 5 min) S3 presigned PUT URL scoped to a key namespaced by module and date (`invoice/2026/07/<uuid>-<fileName>`); server-side validates `contentType` against an allowlist (`image/jpeg`, `image/png`, `application/pdf`) before signing.
- Client uploads the file directly to `uploadUrl` (S3), then submits the returned `fileKey` as part of the normal create/update call (e.g. `POST /invoices` includes `fileKey` from this flow; `POST /inventory/grns` includes `attachments: [{ fileKey, contentType }]`).
- `GET /uploads/view-url?fileKey=...` — `fileKey` is a query param, not a path segment, since it contains slashes (`module/YYYY/MM/uuid-filename`) that would otherwise split across Express route segments. Returns a short-lived presigned **GET** URL for displaying/downloading a private S3 object (files are not public).
- Rationale: routing camera photos through the API server as multipart bodies wastes mobile bandwidth and fails more often on weak connections; presigned upload lets the mobile OS handle retry/resume and keeps large binaries off the API tier entirely.

## App Config (`/app/...`)
Supports mobile force-update and maintenance-mode gating, which a web SPA doesn't need (the web app just serves the latest build) but a distributed mobile app absolutely does:
- `GET /app/config` — public, no auth — returns `{ latestVersion, minSupportedVersion, forceUpdate: boolean, maintenanceMode: boolean, maintenanceMessage }`. Mobile app checks this on launch; if the installed version is below `minSupportedVersion`, it blocks usage with an update prompt instead of hitting outdated/incompatible endpoints.
- Backed by `system_settings`, editable by Super Admin via `PATCH /settings/system`.

## Settings (`/settings/...`)
- `GET/PATCH /settings/company` — singleton, get-or-create on first read
- `GET/POST /settings/approval-matrix`, `PATCH /settings/approval-matrix/:id` — a list of threshold rules (module, amountThreshold, requiredApproverRoleId), not a singleton, since it's inherently multiple entries
- `GET/PATCH /settings/system` (email/SMS/backup config; also backs `GET /app/config`) — singleton, get-or-create on first read

## Dashboard (`/dashboard`)
- `GET /dashboard/summary` — today's purchases, pending payments, pending approvals, low stock, aggregated via MongoDB aggregation pipelines, Redis-cached with short TTL.
- `GET /dashboard/vendor-performance`
- `GET /dashboard/monthly-report`

## Swagger
Full OpenAPI 3 spec generated from JSDoc annotations on each route file (`swagger-jsdoc`), served at `/api/docs`. Every route file documents request/response schema inline — this is generated alongside the route, not retrofitted.

## Cross-cutting middleware chain (applied in this order)
`helmet` → `cors` → `morgan` (request log) → rate limiter (per-route override for auth endpoints) → body parser → `authenticate` (JWT) → `authorize(permissionKey)` → `express-validator` schema → controller → service → repository → global error handler.
