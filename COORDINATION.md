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

## Directive 17 — Final Report (authorized in adfba84)

**Authorization received mid-push.** The directive arrived while items 2 & 3 of the previous proposals table were being pushed; the sequence was rebased onto the authorization (`adfba84..426a682`) and the authorized work then executed to the maximum the owner's credentials allow.

### Option 1 — Crashlytics Native Activation (primary objective): executed to the owner's limit

- **Steps 1–2 (google-services.json + gradle plugin lines): owner-only.** Verified: the file does not exist anywhere in the repo (it is gitignored — a per-owner Firebase credential). Adding the plugin lines without it breaks the Gradle build outright, which is why they remain deliberately absent. Nothing further can be done on these two steps without the owner.
- **Step 3 (initialization guards verified):** the existing `tests/unit/crashlytics.test.ts` (12 tests) already pins the double gate (native platform AND `VITE_CRASH_REPORTING=true`), init, transport-failure swallowing, and full payload redaction.
- **Step 4 (safe test trigger): the real gap, now closed.** Nothing in the repo proved that the app itself calls `initCrashlytics` at startup — or that the promised ordering ("crash reporting first, so faults during the rest of startup are captured") holds. New `tests/unit/crashlyticsWiring.test.tsx` (3 tests) pins:
  1. startup calls `initCrashlytics` exactly once, **first**, before every other initializer (a future startup reorder can no longer silently un-monitor the app);
  2. the full production path of all 171 `silentFail` sites — `silentFail → recordException → sanitizer → plugin` — reports a non-fatal exception **without throwing into the caller** (PII and amounts verified redacted in transit);
  3. with the gate closed (web build), startup completes and nothing is transmitted.
  - Implementation note: the module mock **wraps** the real `initCrashlytics` instead of replacing it — the order log records the wiring while the module's internal `_collectionEnabled` state behaves exactly as in production (the first draft replaced it, and the "safe trigger" test failed against reality — which is precisely what a test trigger is for).
- **Documentation correction:** `src/core/crashlytics.ts`'s header still claimed `initCrashlytics` was "defined but never called" (stale audit-era note; it has been wired from `useAppInitialization` since an earlier fix). The header now records: wired + tested, the two owner-only steps, and the covering test files by name.

### Option 2 — Dependency Audit (the directive's named fallback): complete

Fresh verification showed **0 vulnerabilities** in both `npm audit` and `npm audit --omit=dev` (the "10 vulnerabilities" figure was stale from the phase-1 scan; the fix predates this branch). The one genuinely-open leftover of the original H-1 recommendation — `audit:security` existed but was not wired into `ci:check` — is fixed: any future dependency regression now breaks CI immediately.

### Plus: items 2 & 3 of the previous proposals table (in-flight when the authorization arrived)

- **CI security gate** (see above, Option 2) and
- **`isLoading` "first result" semantics** — `useLiveQuerySafe.hasFirstResult`, `useHomeData.isLoading` now genuinely true until the first result, three `&& !error` guards protecting Directive 16's error state from "eternal skeletons", and the eslint-was-right story (`homeData.error` is a *control* input of the advisor guard; without it in the deps the advisor hangs forever on a broken DB — pinned by a total-failure test that kills mutation M6). Full report in the previous entry below; mutations 6/6 killed.

### Verification (final gates, all green)

- **917/917 tests (100%) across 107 suites** — 906 pre-existing + 8 (isLoading characterization) + 3 (Crashlytics wiring); zero regressions (advisorPage, fetchErrorDisambiguation, crashlytics.test.ts all intact).
- `tsc --noEmit` 0 errors · `npm run lint` 0 warnings/errors · `guardian.mjs validate` clean (11 locales) · zero new i18n keys · `npm run audit:security` clean.
- Permanent memory updated: `GEMINI.md` (top entry) and `AUDIT_REPORT.md` (Section 12.17).

### Next Step Proposals

1. **(Owner action, unlocks the last mile) Provide `android/app/google-services.json`** from the Firebase Console — the two `apply plugin` lines in `android/app/build.gradle` and `VITE_CRASH_REPORTING=true` then light up the entire error surface built across Directives 15–17 (every `silentFail`, every hook `error` state, every sanitized exception becomes observable in Firebase Console; the wiring and ordering are already test-pinned).
2. **Release v23.2 candidate:** with Directive 17 closed (to the owner's limit), a signed release pass through the full `ci:check` chain (tests → security scan → audit gate → lint → build) is the natural next milestone.

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
