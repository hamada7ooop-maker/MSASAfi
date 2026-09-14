# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.16 Approved & Directive 17 Authorized

Exceptional execution on Directive 16! The architectural discovery regarding `useLiveQuery` throwing during render, the invention of `useLiveQuerySafe` preserving full write reactivity without unhandled exceptions, and the systematic disambiguation across all 12 data hooks and views establish a stellar standard for user experience during transient database issues.

- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.16** (`e2f916f`)
  - **APK**: `Masarifi_V23.1.16_Signed_Release.apk` (16,640,176 bytes / 15.87 MB) — SHA256: `E9ED25E16EB8C526D79417B561D700CF81FF58E70B24C891CC5539EC99E8B48E`
  - **Clean Source ZIP**: `Masarifi_V23.1.16_Source_Clean.zip` (9,212,541 bytes / 8.79 MB) — SHA256: `3D4DA0B1B554B7A7008F724FDDCDD98CAAB0422C089936C5E5B4460366ED2CED`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` clean across all 11 locales (3,143 ar keys).
  - **Tests**: **899 / 899 passing (100%)** across **104 test suites** (17 new characterization tests, 8/8 mutations killed).
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.14 / 12.31) permanently recorded.

- **Architectural Findings & Approvals**:
  - **`useLiveQuerySafe` Wrapper**: Brilliant solution to intercept subscription errors into state rather than blowing up renders. Preserving stale-while-revalidating data during failures prevents blank-screen flashes.
  - **Empty-State Suppression Guard**: Enforcing `&& !error` on empty states prevents visual contradictions (e.g. "no debts" appearing next to "failed to load").
  - **Self-Healing Advisor Hook**: Proper error clearing on successful subsequent executions verified under load.

---

### Authorized Directive 17: Production Observability OR Dependency Hygiene

We authorize **Option 1 (Crashlytics Native Activation)** as the primary objective for Directive 17:

#### Objective:
Directives 15 and 16 built an extensive, rigorous error-capture and telemetry infrastructure (`silentFail` routing, `AppLogger`, and `useLiveQuerySafe`). Activating Crashlytics natively in production makes all captured errors, breadcrumbs, and non-fatal exceptions observable in the Firebase Console.

#### Scope of Work:
1. **Crashlytics Native Activation**:
   - Complete the 4 documented steps in `src/core/crashlytics.ts`:
     1. Verify/configure `google-services.json` placement in `android/app/`.
     2. Ensure the Google Services & Crashlytics Gradle plugins are properly applied in `android/build.gradle` and `android/app/build.gradle`.
     3. Verify initialization guards when `VITE_CRASH_REPORTING=true` / native platform detected.
     4. Add a safe test trigger (or characterization test) verifying non-fatal exception reporting without crashing the app.
2. **Secondary Option (Dependency Audit Pass)**:
   - If Crashlytics requires proprietary credentials that cannot be committed to Git, proceed to **Option 2 (Dependency Vulnerability Audit)** to audit and bump vulnerable packages identified in the initial audit.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All 899 existing + new tests passing (100%).
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*

---

## Auditor Report — Directive 17 (items 2 & 3): CI security gate + isLoading first-result semantics

*(Note: the Directive 17 authorization above arrived while these two commits were being pushed — this report covers the work that was already in flight; the Crashlytics activation directive itself is executed in the commits that follow this merge.)*

**Scope.** Items 2 and 3 of the (pre-authorization) proposals table — both unblocked, both done end-to-end.

**Item 2 — dependency audit pass (verified before fixing).** Fresh `npm audit` AND `npm audit --omit=dev` both report **0 vulnerabilities**; the "10 vulnerabilities (1 critical, 6 high)" figure circulating in the proposals was carried over from the original phase-1 scan — the tracking table documents the earlier fix (`6f08582`, outside this branch) and `vite` had already been moved to devDependencies. The single genuinely-open leftover of the original H-1 recommendation: the `audit:security` script existed but was **not wired into `ci:check`** — an unused shield. It is now part of the CI chain, so any future dependency regression breaks CI immediately.

**Item 3 — `isLoading` "first result" semantics.** `useHomeData.isLoading` compared live-query results to `undefined`, but they are seeded with `defaultResult` — the comparison never fired, isLoading was permanently false, and ClassicDashboard's skeletons never rendered (a flash of empty numbers instead). The `if (homeData.isLoading) return;` guard in useAdvisorData was equally dead — the first advisor analysis ran on seeded empty data.
- `useLiveQuerySafe` now exposes `hasFirstResult` (false until the first successful emission; true forever after — a resubscription keeps the last result, so it keeps the flag).
- `useHomeData.isLoading` aggregates the three primary queries' flags (same three the old line intended).
- Three `&& !error` guards protect Directive 16's contract from "eternal skeletons" on an early failure (ClassicDashboard skeletons, AdvisorPage skeletons, and the now-live advisor guard whose compound `isAdvisorLoading` got the same guard).

**The story worth remembering:** eslint's exhaustive-deps flagged `homeData.error` as a missing effect dependency. First instinct was to disable the rule ("guard-only read") — and that was **wrong**: a live diagnostic (persistent rejection, `calls=1`, effect stuck waiting forever) proved the guard reads error as a *control* input; when the decision input changes (error arrives), the effect must re-run or the advisor hangs forever waiting for a first result that will never come. `homeData.error` is now in the deps with a comment documenting why eslint was right. The mutation suite then validated the whole story: **6/6 killed** (`scripts/directive17-loading-mutations.cjs`) — including M6 (severing `error` from the deps), which only died once the "total failure" test rejected **all five** dep-feeding queries (rejecting just the three primary ones let the surviving queries' identity changes re-trigger the effect and mask the mutation).

**Verification.**
- **914/914 tests (100%) across 106 suites — zero regressions** (906 prior + 8 new; advisorPage's 9 and the whole Directive 16 suite included).
- `tsc --noEmit` 0 · `npm run lint` 0 · `guardian.mjs validate` clean · zero new i18n keys · `npm run audit:security` clean.
- **Mutation testing: 6/6 killed** by `tests/unit/firstResultLoading.test.tsx`.
- The characterization file documents the deliberate behavior flip in place: the old state was pinned green *before* the change, then flipped with an explanatory comment — that document-in-test is what separates "intended change" from "regression".

**Permanent memory updated:** `GEMINI.md` (top entry) and `AUDIT_REPORT.md` (Section 12.16).

### Next Step Proposals

1. **Directive 17 (authorized above): Crashlytics native activation** — executing next, in the commits following this merge.
