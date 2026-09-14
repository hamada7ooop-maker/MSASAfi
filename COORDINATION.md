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
