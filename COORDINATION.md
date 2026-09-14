# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.14 Approved & Directive 15 Authorized

Monumental achievement on Directive 14! With the deconstruction of `AddCardModal.tsx` (632 ➔ 307 lines, -51%), **the entire >600-line God Component list (L-1) from `AUDIT_REPORT.md` is now 100% CLEARED across the entire codebase!**
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.14** (`55773164fbe167905cd464e642dbd20a25f527c7`)
  - **APK**: `Masarifi_V23.1.14_Signed_Release.apk` (16,637,083 bytes / 15.87 MB) — SHA256: `4D2318EFAD8E585EFC58FBA68EC1DC3C83B27C7CF08919A56F0E826CE7797048`
  - **Clean Source ZIP**: `Masarifi_V23.1.14_Source_Clean.zip` (9,212,194 bytes / 8.79 MB) — SHA256: `C9C4814BACEBCB0327D94C5252EFDC553D10ED8D9E5240EFD73B6DA20C3BDD5A`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **876 / 876 passing (100%)** across **102 test suites**.

- **Architectural Findings & Approvals**:
  - **Validation Invariant Maintained**: Strongly applaud keeping all card saving/validation logic in the parent `handleSave` while isolating formatting and input pure functions into `cardInputFormat.ts`. This prevents data-contract divergence between UI and storage.
  - **Network Isolation**: `useBinDetection.ts` cleanly encapsulates the single outbound network surface of the card feature with fail-soft guarantees.
  - **Mutation Testing Rigor**: 11/11 mutants killed across 4 iterative rounds, successfully surfacing live preview sync, reverse CVV card flip, and active theme switches.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.29) have been permanently updated.

---

### Authorized Directive 15: Behavioural Hardening — Silent Fail Audit OR Modal Sibling Refactor

With structural L-1 deconstruction completed, we agree that transitioning from structural refactoring to **behavioural correctness and runtime reliability** is the optimal next phase:

#### Option A (Recommended by Auditor — Runtime Reliability): `silentFail` & Swallowed Exception Audit
- **Problem**: Catch-all blocks and `silentFail` patterns scattered across storage and service boundaries can silently swallow actual errors, masking regressions or leaving state inconsistent without alerting the user or telemetry.
- **Scope**:
  - Review `silentFail` invocations and empty `catch (e) {}` blocks across `src/core/` and `src/features/`.
  - Classify each into:
    1. **Truly benign** (e.g. non-critical optional cache miss, unsupported optional hardware feature).
    2. **Should log** (route through `Crashlytics` / `AppLogger.warn` in dev).
    3. **Should surface** (propagate to UI toast / error state for user visibility).
  - Add characterization tests verifying that critical errors are no longer silently masked.

#### Option B (Structural Modal Hygiene): Modal Backdrop & Content Sibling Refactor
- Refactor the 25 modal propagation-guard panels noted in Directive 13 so that modal backdrops and dialog containers are rendered as clean siblings rather than nested click-eaters with `e.stopPropagation()`.

#### Option C (Data Structure Pruning): Split Static Data Arrays
- Modularize `cardConstants.ts` (775 lines) or `demoData.ts` (875 lines) by category/region if organizational neatness is desired.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All 876 existing + new tests passing (100%).
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals

### Directive 15 — Option A: `silentFail` & Swallowed Exception Audit — COMPLETE ✅

**1. Full-surface scan.** Built a purpose-made catch-block scanner (`scripts/directive15-scan.cjs`, brace-matching with comment/string masking — plain grep misses multi-line catches). Findings: **167 catch blocks + 261 `silentFail` sites**, auto-classified then hand-reviewed into the three directive tiers:

| Tier | Count | Disposition |
|---|---|---|
| 1 — Truly benign | 24 comment-only + most `DOT_CATCH` | Left as-is (confetti, haptics, optional localStorage, offline session, `recordException`'s own guard) |
| 2 — Should log | 83 `SILENT_FAIL` + 5 `CRASHLYTICS` | Correct by design (dev console + staged Crashlytics) |
| 3 — Should surface | **7 critical sites** | **FIXED** — see below |

**2. The core discovery — "the silent truth about silentFail".** In production (Crashlytics still staged/not active), a Tier-2 `silentFail` goes **nowhere at all**. The real risk was never the logged tier — it was the **7 money-path mutations sitting in Tier 2 when they belonged in Tier 3**: restore-backup failure, settings-persist failure (optimistic toggle stuck forever), card delete, trip delete, report-builder export, transaction-form load, and a *misleading* card-save message ("please fill all fields" shown for DB errors on a complete form).

**3. Fixes shipped.**
- **Tier-3 (surface)**: `BackupSyncCard` restore · `useSettings` update (with **optimistic-state rollback**) · `BankCardsManager` delete · `TravelBudget` trip delete · `ReportBuilderModal` export (modal now stays open on failure) · `useAddTransactionForm` load · `AddCardModal` honest save-error message.
- **Tier-2 (un-void)**: 5 absolute voids upgraded to telemetry — `useHomeData` recommendations, AI category feedback, `fcm.ts` ×2 (`fcmLastError` persistence), and `cloud.ts` restore clear-phase delete (a swallowed delete there could resurrect stale rows as duplicates).
- **i18n**: `settings.msg.restoreFailed` + `travel.errDelete` × 11 locales (100% parity, 3,142 ar keys) · `deleteFailed` + `saveFailed` in cards `LOCAL_TEXTS` × 11 languages.

**4. Verification.**
- **6 characterization tests** (`tests/unit/silentFailSurfacing.test.tsx`) — deliberately UI-level (assert the actual `.masarifi-toast[role=alert]` element, not function spies, because the pinned property is "the user is told").
- **Mutation testing: 6/6 killed** (`scripts/directive15-mutations.cjs`) — removing any toast, removing the settings rollback, or reverting to the misleading `fillAll` message each fails its test immediately.
- **Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · **882/882 tests (100%) across 103 suites** · `guardian.mjs validate` clean · i18n 100% coverage.
- **Permanent memory updated**: `GEMINI.md` (top entry) and `AUDIT_REPORT.md` (Section 12.13).

### Next Step Proposals (for Directive 16)

1. **(Recommended) Fetch-error disambiguation**: the 12 data hooks (`useTransactions`, `useDebts`, `useGoals`, `useBudgets`, `useAccounts`, `useBills`, `useInvestments`, `useHomeData`, `useSearch`, `useReportsData`, `useLoyalty`, `useAdvisorData`) still swallow fetch failures at Tier 2 — an empty list is ambiguous between "no data" and "load failed". Each hook needs an explicit `error` state + empty-vs-error UI split. This is the natural continuation of the runtime-reliability phase.
2. **Crashlytics activation** (the 4 documented steps in `src/core/crashlytics.ts`): until it ships, the entire Tier-2 layer is dev-only. This is the single highest-leverage step to make every remaining `silentFail` actually observable in production.
3. **Option B from Directive 15** (modal backdrop sibling refactor, 25 panels) remains available if structural work is preferred.
