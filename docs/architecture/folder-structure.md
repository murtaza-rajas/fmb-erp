# FMB ERP — Folder Structure

Follows the Clean Architecture layering mandated for this project: Presentation → Controller → Service → Repository → Database. Controllers never touch models directly.

```
fmb-erp/
├── docs/
│   ├── architecture/          # this design set (schema, roles, api, folders)
│   ├── er-diagram.md
│   ├── sequence-diagrams/
│   ├── deployment-guide.md
│   └── user-manual.md
│
├── docker/
│   ├── docker-compose.yml
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx/
│       └── default.conf
│
├── backend/
│   ├── src/
│   │   ├── config/            # db.js, redis.js, env.js, swagger.js, socket.js, s3.js (presigned URL client), firebase.js (FCM admin init)
│   │   ├── constants/         # enums: PO_STATUS, ROLES, PERMISSIONS, NOTIFICATION_TYPES
│   │   ├── models/            # Mongoose schemas — one file per collection in database-schema.md
│   │   ├── repositories/      # data access only — no business logic. One per model.
│   │   ├── services/          # business logic, transactions, orchestration. One per domain (e.g. purchaseOrderService.js, uploadService.js — issues/validates presigned S3 URLs, pushNotificationService.js — FCM send + invalid-token cleanup)
│   │   ├── controllers/       # thin — validate via middleware, call service, shape response
│   │   ├── routes/            # one file per module, mounted under /api/v1
│   │   ├── validators/        # express-validator schemas, one per route file
│   │   ├── middlewares/       # authenticate, authorize, errorHandler, auditLogger, queryParser, upload
│   │   ├── helpers/           # pure functions: numberFormatting, poNumberGenerator, dateHelpers
│   │   ├── utils/             # ApiResponse, ApiError, logger, asyncHandler
│   │   ├── jobs/              # cron: reorderAlertJob, tokenCleanupJob, reminderEngineJob
│   │   ├── events/            # domain events + listeners (e.g. grnCreated -> stockLedgerListener)
│   │   ├── socket/            # socket.io namespaces + emit helpers
│   │   ├── uploads/            # local dev upload target (prod uses cloud storage adapter)
│   │   ├── app.js             # express app assembly (middleware chain)
│   │   └── server.js          # http server + socket.io bootstrap
│   ├── tests/
│   │   ├── helpers/            # db.js (mongodb-memory-server replica set), seed.js (permissions/roles/users)
│   │   ├── integration/        # supertest against the real Express app + in-memory Mongo
│   │   └── fixtures/
│   ├── jest.config.js
│   ├── eslint.config.js
│   ├── .env.example
│   ├── package.json
│   └── swagger-output.json     # generated, gitignored
│
└── frontend/
    ├── src/
    │   ├── app/                # store setup, root providers, App.tsx
    │   ├── routes/             # route definitions, protected-route wrapper, role-based guards
    │   ├── layouts/             # DashboardLayout, AuthLayout
    │   ├── features/           # one folder per domain module, each self-contained:
    │   │   ├── auth/
    │   │   ├── users/
    │   │   ├── masters/
    │   │   ├── procurement/     # requisitions, purchase-orders
    │   │   ├── inventory/       # grn, stock-ledger, adjustments, transfers
    │   │   ├── invoices/
    │   │   ├── finance/         # payment-vouchers, payments, vendor-ledger
    │   │   ├── reports/
    │   │   ├── notifications/
    │   │   └── settings/
    │   │       # each feature/* contains: components/, hooks/, api.ts (RTK Query or React Query), slice.ts (if needed), types.ts, validation.ts (Yup)
    │   ├── components/         # cross-feature reusable UI: DataTable, StatusBadge, ConfirmDialog, PageHeader, EmptyState, SkeletonLoader
    │   ├── hooks/              # cross-feature hooks: usePermission, useDebounce, useSocket
    │   ├── services/           # axios instance, interceptors (token refresh), socket client
    │   ├── store/              # Redux Toolkit root store, RTK Query base api
    │   ├── theme/              # MUI theme (light/dark), palette, typography
    │   ├── utils/              # formatters, constants mirrored from backend enums
    │   └── main.tsx
    ├── public/
    ├── .env.example
    ├── package.json
    └── vite.config.ts
```

## Rules enforced by this structure

- A **controller** may only call **one service method** per action — no orchestration logic in controllers.
- A **service** may call multiple **repositories** and other services, and owns MongoDB transaction boundaries (e.g. `GrnService.createGrn` wraps GRN insert + stock ledger writes + PO status update in one `session.withTransaction`).
- A **repository** exposes only data-access methods (`findById`, `findPaginated`, `create`, `updateById`, `softDelete`) — it never contains conditional business logic.
- Frontend **features/** are the unit of code-splitting (`React.lazy` per feature route) — this is where "Lazy Loading" from the performance requirements is implemented concretely.
- Shared enums (PO status, roles, permission keys) are defined once in `backend/src/constants/` and mirrored in `frontend/src/utils/constants.ts` — kept in sync manually for now; a shared-types package is a reasonable future step once the monorepo tooling is decided, not before.
