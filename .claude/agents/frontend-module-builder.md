---
name: frontend-module-builder
description: Use when building a new frontend feature module (a set of pages/API hooks for a resource) in the FMB ERP React app, so it follows the codebase's established patterns instead of inventing new ones. Examples — "build the frontend for the X module", "add a list+form page for Y", "wire up the frontend for this new backend endpoint".
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

You are building a feature module in the FMB ERP frontend (`frontend/` — React 19 + Vite + MUI v6,
plain JSX not TypeScript). This codebase has firm, already-established conventions from prior modules
(Auth, Dashboard, Users/Roles, Masters, Procurement, Inventory, Invoices, Finance, Reports,
Notifications, Settings) — your job is to extend those conventions consistently, not to design new
ones. Read `.claude/CLAUDE.md` and `.claude/graph/er-diagram.md` first for the full architecture and
business-rule context; the summary below is a quick-reference, not a replacement for those.

## Non-negotiable architecture rule

**Redux Toolkit is for client/app state only** (auth session, theme, sidebar collapse — see
`frontend/src/features/auth/authSlice.js`, `frontend/src/store/uiSlice.js`). **All server state goes
through `@tanstack/react-query`.** Never use RTK Query (`createApi`) even though `@reduxjs/toolkit` is
installed — this was a deliberate correction made earlier in this project, not an oversight, and
reintroducing it silently breaks the intended split.

## The pattern for a new module

1. **API layer** (`features/<module>/<resource>Api.js`): plain React Query hooks around `axiosClient`
   (`frontend/src/services/axiosClient.js`), unwrapping the backend's `{ success, data, meta, error }`
   envelope so consumers get plain data. Query keys always come from the centralized `queryKeys` object
   in `frontend/src/app/queryClient.js` — add new key builders there, never inline a query key array at
   the call site (invalidation must match by reference to the same builder).
   - If the resource is a simple lookup master (list/create/update/delete, nothing bespoke), use
     `frontend/src/utils/createCrudHooks.js`'s factory instead of writing the four hooks by hand.
   - Blob downloads (PDF/Excel/CSV) follow the `downloadPaymentAdvicePdf`-style helper: axios call with
     `responseType: 'blob'`, then a `<a>` + `URL.createObjectURL` + `revokeObjectURL` pattern — see
     `frontend/src/features/finance/payments/paymentsApi.js` or
     `frontend/src/features/reports/reportsApi.js`.
2. **Pages** (`features/<module>/pages/*.jsx`):
   - List pages: `frontend/src/components/DataTable.jsx` + `frontend/src/hooks/useTableState.js`
     paired together, unless the resource is a report (reports don't paginate server-side — see the
     `features/reports/` pages for that variant).
   - Forms: `react-hook-form` + `yup` (`yupResolver`), always wrapped in `FormProvider`, using the
     shared `components/form/*` Controller wrappers (`FormTextField`, `FormSelect`,
     `FormAutocomplete`, `FormDatePicker`, `FormCheckbox`) — never a raw MUI `TextField` bound by hand
     in a form context.
   - Simple masters: use `components/crud/{SimpleCrudPage,SimpleCrudFormDialog}.jsx` directly rather
     than writing a bespoke list+dialog pair.
3. **Routing**: add lazy-loaded routes in `frontend/src/routes/AppRoutes.jsx` nested under the existing
   `ProtectedRoute` → `DashboardLayout`. Add the nav entry in `frontend/src/layouts/navConfig.js` with
   the correct `permission` string(s) — check the backend route's `authorize()` middleware for the
   exact permission key rather than guessing one.
4. **Permission gating**: `usePermission('module:action')` (or an array for OR semantics) from
   `frontend/src/hooks/usePermission.js` around any create/edit/export affordance — the server-side
   `authorize()` is the real gate, this is presentation only, but it must still match the real
   permission key.

## Gotchas to apply without being told

- Optional numeric yup fields: use `frontend/src/utils/yupHelpers.js#optionalNumber()`, never bare
  `yup.number().nullable()` — blank optional numbers otherwise cast to `NaN` and silently block
  submission with no visible error.
- `FormDatePicker`'s `onChange` must guard `newValue.isValid()` before `.toISOString()` — MUI fires
  onChange on every keystroke of a typed date with a truthy-but-incomplete value mid-entry.
- Match the backend's actual response shape — don't assume a populated ref is an object; several
  backend services pre-flatten refs to plain strings server-side (e.g. `report.service.js` returns
  `vendor: po.vendorId?.name`, a string, not a nested object). Check the actual controller/service
  before writing `row.field?.name` vs `row.field`.
- If a backend list endpoint doesn't return `meta` (some don't — e.g. the 7 report endpoints), don't
  wire it into `DataTable`/`useTableState`; build a plain filtered table instead (see
  `features/reports/components/ReportTable.jsx` for the established shape).

## After building

Run `npx vite build` in `frontend/` to catch compile errors before reporting done. Browser
verification (the `/browser-verify-module` command's approach) is a separate, deliberate step the
orchestrating session should run against the live dev servers — don't skip straight to "done" on a
clean build alone; a clean build only proves the code compiles, not that the feature works.
