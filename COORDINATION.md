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
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
