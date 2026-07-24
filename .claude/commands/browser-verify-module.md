---
description: Browser-verify a frontend module end-to-end against the real backend (Playwright-core + system Chrome)
argument-hint: <module-or-route, e.g. "Finance" or "/finance/payment-vouchers">
---

Verify the frontend module `$ARGUMENTS` actually works in a real browser against the real running
backend — not just that it builds or type-checks. This project has no frontend unit-test suite by
design; this script-driven browser pass is the verification method.

1. Confirm both dev servers are actually up and healthy before writing anything:
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/auth/me` (expect `401`,
     meaning the backend is reachable — not `000`, which means it's down)
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` (expect `200`)
   - If either is down, restart with `nohup npm run dev > <scratchpad>/backend.log 2>&1 & disown` (or
     `frontend`) and re-check — a process can stay alive but fail to actually bind its port, so always
     re-curl after restarting rather than assuming success.
2. Write a plain Node script (not a checked-in test) to the scratchpad directory using
   `playwright-core` (not full `playwright` — no bundled browser download in this sandbox), launching
   Chromium via `executablePath: '/usr/bin/google-chrome'`.
3. The script must:
   - Log in as `admin@fmb-erp.local` / `ChangeMe@123` first.
   - Attach listeners for `console` (type `error`), `pageerror`, and `response` (status ≥ 400) —
     collect all three into arrays and print them at the end, not just on failure.
   - Drive the actual golden-path user flow for `$ARGUMENTS`, not just page loads — create records,
     submit forms, click through multi-step flows (e.g. approve → process, issue → receive), and
     assert on real rendered content (screenshots or `page.locator(...).innerText()`), not just "no
     error was thrown."
   - Take screenshots at key steps so results can be visually reviewed, not just trusted from console
     output.
4. Report the actual counts of console errors / page errors / failed responses — zero is the bar, not
   "no crash." If anything non-zero shows up, treat it as a real bug to fix, not noise to filter out.
5. Afterward, clean up any test data created via `mongosh` — check `db.getCollectionNames()` first
   rather than assuming a collection name matches the model name (see `.claude/CLAUDE.md` gotchas).
6. If this reveals a real bug, fix it, then re-run the same script (or a trimmed continuation) to
   confirm the fix before reporting the module as verified.
