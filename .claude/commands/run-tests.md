---
description: Run the backend Jest test suite (Supertest + mongodb-memory-server replica set)
---

Run the FMB ERP backend test suite and report results.

1. `cd backend && npm test` (this runs `jest --runInBand` — tests must run serially, not in parallel,
   because they share a single `mongodb-memory-server` replica set instance for real Mongoose
   transactions).
2. `tests/helpers/setupEnv.js` auto-points `mongodb-memory-server` at the system's `/usr/bin/mongod`
   binary when present (no internet access in this sandbox to download one) — if tests fail with a
   binary-download error, check that file and confirm `/usr/bin/mongod` still exists rather than
   assuming a real regression.
3. If specific tests are named in `$ARGUMENTS`, run only those: `npm test -- $ARGUMENTS`.
4. Report a plain pass/fail count. If anything fails, show the actual assertion failure (not just
   "tests failed") and identify whether it's a real regression or an environment issue (stale seed
   data, a port already in use, mongod binary missing) before proposing a fix.
5. Do not skip failing tests, comment them out, or add `--forceExit`/`--detectOpenHandles` flags to
   make failures go away — find the root cause.
