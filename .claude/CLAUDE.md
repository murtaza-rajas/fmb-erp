# FMB ERP — Project Notes for Claude Code

FMB Nagpur's procurement/inventory/finance ERP. Authoritative business rules live in the
`FMB_Procurement_Payment_SOP.docx` this project was built against — when in doubt about a workflow
rule, that SOP wins over convenience or convention.

**Do not add a master, field, role, or module beyond what the SOP literally specifies without asking
first.** This has happened twice already — a `Department` master and four extra `Vendor` fields
(`address`, `gstin`, `panNumber`, `status`) were added as generic "real ERPs have this" convenience,
neither was SOP-mandated, and both had to be torn back out. Section 4 ("Master data required") lists
the exact fields for each master — treat it as the field-level spec, not just a list of master names.
If a field seems obviously necessary but isn't listed, say so and ask rather than adding it — a strong
textual hook elsewhere in the SOP (e.g. Step 6's TDS check implying a vendor PAN) is worth surfacing,
but still isn't grounds to add it unilaterally.

See `.claude/graph/er-diagram.md` for the DB schema and how every model relates to every other model —
read that before adding a new model or field so you don't duplicate an existing relationship or break
the polymorphic ledger pattern. It also documents exactly which fields were added-then-removed and why,
so the same mistake isn't repeated.

## Tech stack

- **Backend**: Node/Express, Mongoose/MongoDB (real multi-document transactions via sessions —
  requires a MongoDB **replica set**, including in tests), JWT + rotating refresh tokens,
  express-validator, Redis (optional — must degrade gracefully, see gotcha below), Firebase Admin
  (FCM push), AWS S3 presigned uploads, pdfkit, exceljs, Jest + Supertest + mongodb-memory-server.
- **Frontend**: React 19 + Vite, plain JSX (not TypeScript, matches backend's plain-JS style), MUI v6,
  **Redux Toolkit for client state only** (auth session, theme, sidebar — never server data),
  **React Query for all server state** — these are used side by side, never conflated; RTK Query is
  not part of this stack even though `@reduxjs/toolkit` is installed. react-hook-form + yup,
  @tanstack/react-table wrapped in a custom `DataTable`, Chart.js, socket.io-client, notistack, dayjs.

## Business rules that must not be "fixed"

- **No PO approval step.** Procurement Head issues a PO directly (`draft → issued`); there is no
  separate approver role in that transition. Don't add one without being asked.
- **Single payment-approval gate**, and only it: `PaymentVoucher.approvalStatus`. It is hard-restricted
  to `staffType: 'paid'` users at three separate points in the codebase (role assignment, role
  permission update, and the approval action itself) — never to "Khidmat Gujar" staff. If you touch
  payment-voucher approval logic, all three checks must stay in sync.
- **No payment without a matched PO + GRN + Invoice.** This isn't just validated in a controller — the
  schema chain enforces it structurally (see the ER diagram's Finance section).
- **Stock updates happen at GRN time, not payment time.**
- PO lifecycle is exactly: `draft → issued → partially_received → received → invoiced →
  payment_pending → paid → closed`.

## Established frontend patterns — reuse, don't reinvent

- `frontend/src/utils/createCrudHooks.js` — factory for simple list/create/update/delete React Query
  hooks (mirrors the backend's generic master pattern). Use directly for any new simple lookup master;
  write bespoke hooks only when there's real extra logic.
- `frontend/src/components/crud/{SimpleCrudPage,SimpleCrudFormDialog}.jsx` — generic CRUD list+dialog
  page for simple masters.
- `frontend/src/components/DataTable.jsx` + `frontend/src/hooks/useTableState.js` — paired
  server-side paginated/sorted/searched table. Every list page uses this pair, except the 7 Reports
  pages (the backend report endpoints don't paginate — see `.claude/graph/er-diagram.md` context and
  `docs/architecture/api-design.md`).
- `frontend/src/components/form/*` — react-hook-form `Controller` wrappers (`FormTextField`,
  `FormSelect`, `FormAutocomplete`, `FormDatePicker`, `FormCheckbox`), always used inside a
  `FormProvider`.
- `frontend/src/app/queryClient.js` — one `QueryClient` + a centralized `queryKeys` object. Every
  query key is referenced from here, never inlined, so invalidation always matches.
- `frontend/src/utils/yupHelpers.js#optionalNumber()` — **required** for every optional numeric yup
  field. Bare `yup.number().nullable()` casts `''` to `NaN` and silently blocks form submission with no
  visible error and no network call.

## Known gotchas (already fixed once — don't reintroduce)

- **`express-validator`'s bare `.optional()`** only skips validation on `undefined`, not `''` — and
  every frontend form defaults blank optional fields to `''`. Every optional-field validator in this
  codebase uses `.optional({ values: 'falsy' })`. Never write a bare `.optional()` here.
- **`.optional({ values: 'falsy' })` only skips *validation* — it doesn't touch the value itself.** An
  unselected optional dropdown still submits `''`, which then hits Mongoose as a literal empty string.
  For a plain `String` field that's harmless, but for an `ObjectId` ref (`storeId`, `parentCategoryId`,
  `taxId`, ...) Mongoose's cast rejects `''` (only `undefined`/`null` mean "no value"), crashing with a
  `CastError` at the model layer — past the validator, so it doesn't come back as a clean 422. Fixed
  once, globally, via `backend/src/middlewares/normalizeBody.middleware.js`, mounted right after body
  parsing in `app.js` — it recursively converts every empty-string value in the request body to `null`
  before any validator or service sees it. Don't work around this per-form on the frontend (e.g.
  `value || undefined` in a single `onSubmit`) — the previous fix for Vendor's `paymentTermsId` did
  that, and it didn't protect every other optional ref field, which is exactly how the `User.storeId`
  crash slipped through. Rely on the middleware; don't reintroduce a manual per-field patch.
- **MUI `<Drawer variant="permanent">`** renders its `Paper` with `position: fixed` internally, so a
  flexbox sibling never gets pushed over — the main content `Box` needs an explicit `ml` matching the
  drawer's width (see `DashboardLayout.jsx` / `Sidebar.jsx`'s exported `DRAWER_WIDTH`/`COLLAPSED_WIDTH`).
- **MUI `DatePicker`'s `onChange`** fires on every keystroke of a typed date with a truthy-but-invalid
  intermediate `Dayjs` object — always guard with `.isValid()` before calling `.toISOString()`.
- **MongoDB collection names don't always match model names** — invoices are stored in
  `vendorinvoices` (not `invoices`), vendor ledger entries in `vendorledgerentries` (not
  `vendorledgers`). Run `db.getCollectionNames()` before writing a cleanup/seed script rather than
  guessing.
- **Redis is optional and must degrade gracefully** — `backend/src/config/redis.js` retries forever
  with backoff (so it self-heals if Redis comes back) but logs the connection error only once per
  outage, not on every retry. `backend/src/utils/cache.js`'s `safeGet`/`safeSet` wrap every Redis call
  in a 300ms timeout + try/catch — don't remove that even if it looks redundant with ioredis's own
  retry config; ioredis's queue/retry settings alone weren't reliable enough to prevent request hangs.

## Testing methodology

- Backend: `npm test` in `backend/` — Jest + Supertest against `mongodb-memory-server`, started **as a
  replica set** (required for the real transactions used in PO issue / payment processing / GRN
  receipt). See `/run` skill or `backend/tests/helpers/` for the harness.
  `backend/tests/helpers/seed.js` is a **test-only** helper — `createUser()`'s default password
  (`Password@123`) is not the dev-environment login; see below for that.
- Frontend: no unit test suite — verification is done by actually driving the app in a real browser.
  The established pattern: `playwright-core` (not full Playwright, no bundled browser download)
  pointed at the system's `/usr/bin/google-chrome` via `executablePath`, driven by a hand-written
  Node script (not a checked-in test file) that logs console errors, page errors (with stack traces),
  and any HTTP response ≥ 400. Write these scripts to the scratchpad, run against the live dev servers,
  and always clean up any test data created (via `mongosh`) afterward — check
  `db.getCollectionNames()` first, don't assume a collection name.

## Dev environment

- Backend: `cd backend && npm run dev` (nodemon, port 5000). Requires MongoDB running locally.
- Frontend: `cd frontend && npm run dev` (Vite, port 5173).
- Dev login: `admin@fmb-erp.local` / `ChangeMe@123` (Super Admin, full permissions) — seeded via
  `backend/src/seed/index.js`, overridable with `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD`.
- If a dev server goes down unexpectedly (stray Ctrl+C in its terminal, crash), restart with
  `nohup npm run dev > <logfile> 2>&1 & disown` and verify with a health-check curl before assuming
  it's back — a process can be alive but not actually bound to its port after a bad startup.
