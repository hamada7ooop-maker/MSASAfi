# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.15 Approved & Directive 16 Authorized

Outstanding execution on Directive 15! Unmasking silently-swallowed exceptions, classifying 167 catch blocks, implementing optimistic-state rollbacks in `useSettings`, surfacing real toasts on 7 critical data-mutation paths, and killing 6/6 mutations elevates runtime reliability and transparency to a new standard.

- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.15** (`bfef892ce1473c58777e24b841efd6c5947757c1`)
  - **APK**: `Masarifi_V23.1.15_Signed_Release.apk` (16,637,835 bytes / 15.87 MB) — SHA256: `BF1A19D8C64DDE05FE791812B529BE3D77692447DCB9638EB664BA61324E6B8D`
  - **Clean Source ZIP**: `Masarifi_V23.1.15_Source_Clean.zip` (9,223,684 bytes / 8.80 MB) — SHA256: `0F26B3B59FDF0B8B0E4E36CD5FB2577999B43E0C5288D042243194E2574CF40A`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` clean across all 11 locales.
  - **Tests**: **882 / 882 passing (100%)** across **103 test suites**.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.30) permanently recorded.

- **Architectural Findings & Approvals**:
  - **Toast-Level Characterization**: Testing `.masarifi-toast[role=alert]` elements directly ensures tests assert what the user actually experiences rather than verifying internal function mocks.
  - **Optimistic State Rollback Invariant**: `useSettings` now properly reverts state when IndexedDB/Dexie write fails, preventing silent desync between UI switches and storage.
  - **Honest Error Messaging**: Replacing the misleading "fill all fields" toast with genuine failure toasts prevents user confusion during transient database errors.

---

### Authorized Directive 16: Data Fetch Hook Disambiguation (Empty State vs. Load Failure)

We authorize **Option 1 (Fetch-Error Disambiguation)** as the primary objective for Directive 16, continuing the runtime reliability initiative:

#### Objective:
Currently, the 12 core data hooks (`useTransactions`, `useDebts`, `useGoals`, `useBudgets`, `useAccounts`, `useBills`, `useInvestments`, `useHomeData`, `useSearch`, `useReportsData`, `useLoyalty`, `useAdvisorData`) catch fetch failures and return empty arrays/default state. This creates an ambiguity: the UI cannot differentiate between a genuinely empty entity list (e.g. new user with zero transactions) and a broken database/query failure.

#### Scope of Work:
1. **Hook Error Surface**:
   - Expose explicit `error: Error | null` (or boolean `isError`, plus optional `retry()` callback) from each data hook.
2. **UI Disambiguation**:
   - Ensure corresponding views render distinct states for "No items recorded yet" vs. "Failed to load data (Retry)".
3. **Graceful Fallback & i18n**:
   - Include clear localized error messages across all 11 languages using existing keys or standard translation patterns.
4. **Verification & Mutation Testing**:
   - Add characterization tests confirming the hook exposes `error` when DB queries reject.
   - Run mutation testing (e.g. flipping error catch back to returning `[]`) to verify tests catch regressions.

*(Secondary Options: Crashlytics native activation or modal sibling refactor remain optional bonus items if time permits).*

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All 882 existing + new tests passing (100%).
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals

### Directive 16 — Fetch Error Disambiguation — COMPLETE ✅

**1. Architectural discovery.** The installed `dexie-react-hooks` `useObservable` ends with `if (monitor.current.error) throw monitor.current.error;` — the stock `useLiveQuery` **throws on querier rejection even when a `defaultResult` is provided**. One broken table in `useHomeData` was detonating the entire dashboard render up to the nearest ErrorBoundary. The third argument protects against `undefined`, not against failure.

**2. Shared infrastructure.**
- **`src/core/hooks/useLiveQuerySafe.ts`** — wraps the *same* `Dexie.liveQuery` subscription (live reactivity on writes preserved verbatim) but routes the error callback into `error` state instead of a render throw; keeps the last good result while an error is pending; a resubscription IS the retry. Exports `toError()` for normalization.
- **`src/components/common/ErrorState.tsx`** — the third visual state (after skeleton and empty): `role=alert`, localized `common.loadFailed`, `common.retry` button, `compact` variant for widgets.

**3. All 12 hooks upgraded** with `error: Error | null` (set in catch **alongside** silentFail — telemetry never dropped) + `retry()`:
- 10 manual-fetch hooks (useAccounts, useInvestments, useBills, useDebts, useGoals, useBudgets, useTransactions, useReportsData, useLoyalty, useSearch — the last via a `retryToken` in the debounce effect deps).
- **useHomeData**: all 8 live queries converted to `useLiveQuerySafe` with a unified `retryToken` that resubscribes them all; first error wins as one `liveError`.
- **useAdvisorData**: own analysis error merged with the propagated homeData error (`advisorError || homeData.error`); retry retries both. *Self-healing documented:* a later successful re-run legitimately clears the error — this surfaced live during testing (the first draft used `mockRejectedValueOnce` and the trace showed `getAll` called 4×: 300, 5, 100, 300).

**4. UI disambiguation — 12 views wired** with ErrorState: Accounts, Investments, Bills, Debts, Goals, Budgets, TransactionList, Reports, Shop, SearchPage, ClassicDashboard, AdvisorPage. Key design decision: **the empty state is suppressed during error** (`&& !error` in TransactionList) — otherwise "no transactions" and "failed to load" would render together, contradicting each other.

**5. Verification.**
- **17 characterization tests** (`tests/unit/fetchErrorDisambiguation.test.tsx`): 12 hook-level (every hook, incl. retry-recovery on useAccounts & useHomeData) + 3 view-level (error ≠ empty, retry click recovers, empty text absent during error) + 2 ErrorState contract tests.
- **Mutation testing: 8/8 killed** (`scripts/directive16-mutations.cjs`) — reverting any catch to silent, severing advisor error propagation, dropping the `!error` empty-state guard, emptying the `useLiveQuerySafe` error callback, and deleting the retry button each fail their test immediately.
- **Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · **899/899 tests (100%) across 104 suites — zero regressions on the existing 882** · `guardian.mjs validate` clean · i18n-sync 100% parity (ar: 3,143 keys).
- **i18n**: `common.loadFailed` added × 11 locales; reused existing `common.retry`.
- **Permanent memory updated**: `GEMINI.md` (top entry) and `AUDIT_REPORT.md` (Section 12.14).

**6. Documented out-of-scope finding.** `useHomeData.isLoading` compares live-query results to `undefined`, but they are never `undefined` (they carry defaults) — its current "always false" behavior was preserved deliberately; fixing it changes dashboard skeleton semantics and belongs to a future directive (a "first result" notion in `useLiveQuerySafe`).

### Next Step Proposals (for Directive 17)

1. **(Recommended) Crashlytics native activation** — the 4 documented steps in `src/core/crashlytics.ts` (google-services.json, apply plugin, `VITE_CRASH_REPORTING=true`, test crash). Directives 15+16 built a complete, tested error surface — activation is the single step that makes every `silentFail` and every `error` state observable in production.
2. **Dependency audit pass** — the original audit found 10 npm vulnerabilities (1 critical, 6 high) in `npm audit`; a targeted, tested bump pass is the right pre-23.2 hygiene step.
3. **`isLoading` "first result" semantics** for `useLiveQuerySafe` (small, but changes dashboard skeletons — needs its own characterization round).
