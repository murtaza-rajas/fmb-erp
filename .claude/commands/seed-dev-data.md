---
description: Re-seed permissions/roles/Super Admin into the dev MongoDB (fmb_erp_dev)
---

Seed (or re-seed) the FMB ERP dev database's baseline data.

1. `cd backend && npm run seed` — runs `src/seed/index.js`, which upserts permissions and roles
   (`bulkWrite` with `upsert: true`, keyed on `key`/`name`) and get-or-creates the Super Admin user.
   This is **idempotent** — safe to run repeatedly, it will not duplicate permissions/roles or reset
   the Super Admin's password if the user already exists.
2. Default Super Admin credentials (overridable via `SEED_SUPER_ADMIN_EMAIL` /
   `SEED_SUPER_ADMIN_PASSWORD` env vars, unset in this dev setup): `admin@fmb-erp.local` /
   `ChangeMe@123`.
3. This does **not** touch business data (vendors, POs, invoices, etc.) — it only seeds
   permissions/roles/the admin account. If asked to wipe test/business data instead, use `mongosh
   fmb_erp_dev` directly and confirm collection names first with `db.getCollectionNames()` — several
   collection names don't match their model names (e.g. `vendorinvoices`, `vendorledgerentries`; see
   `.claude/CLAUDE.md` gotchas section) — never guess a collection name before deleting from it.
4. If `$ARGUMENTS` names specific collections to clear before reseeding, confirm with the user before
   running any `deleteMany`/`drop` against the dev DB — this is a destructive action even in a dev
   environment, and the user may have in-progress manual testing data in there.
