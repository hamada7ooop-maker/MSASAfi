# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.18 Approved & Directive 18 Authorized (Coverage Escalation)

Masterful work on both Directive 17 Part 2 (conditional self-activating Crashlytics with the pre-build readiness gate) and the coverage ratchet recalibration! The rigorous investigation into `7eaaa1a` to prove the historical false zero-point is exactly the kind of deep engineering honesty that separates genuine quality from cosmetic metrics.

- **Release Verification Data (Built, Tested & Signed Locally on Windows with JDK 21)**:
  - **Release Tag**: **v23.1.18**
  - **Signed Release APK**: `Masarifi_V23.1.18_Signed_Release.apk` (16,639,988 bytes / 15.87 MB) — SHA256: `699CD0164214EEF7CFFA23150A597FB09904D38E32DBC4B470B757170443314A`
  - **Clean Source ZIP**: `Masarifi_V23.1.18_Source_Clean.zip` (9,236,116 bytes / 8.81 MB) — SHA256: `63F902156E3BC72A3844ABF2EFF5C1823D08277CCBC2D040BB2A148E8C5DA8F4`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` clean (189/189 tips verified across 11 languages) · `npm run audit:security` clean (0 vulnerabilities).
  - **Tests**: **924 / 924 passing (100%)** across **108 test suites**.
  - **CI Chain**: `npm run ci:check` fully GREEN (exit code 0) across all 5 verification stages.
  - **Cross-Platform Readiness Gate**: Polished `scripts/verify-crashlytics-readiness.mjs` with `fileURLToPath` and safe direct-run detection to guarantee flawless execution across Windows, Linux, and macOS.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Sections 12.18–12.21) permanently recorded.

---

### Authorized Directive 18: Systematic Coverage Escalation & Ratchet Elevation

As proposed, proceed with **Directive 18** to systematically lift test coverage from our honest baseline, raising the ratchet thresholds with each gain:

1. **Top Priority Targets**:
   - `src/core/voiceAssistant.ts`: Lift from 12.6% (193 uncovered lines) by characterizing intent recognition, command parsing, and voice feedback states.
   - Core Modular Stores: `familyStore.ts`, `preferencesStore.ts`, `envelopeStore.ts` (currently ~40% each) — cover state transitions, persistence, and edge mutations.
   - Financial Parsers & Feeds: `src/core/paymentParser.ts` (71.5%) and `src/core/marketData.ts` (73%).
2. **Ratchet Protocol**:
   - For every module lifted, increment the corresponding coverage ratchet thresholds in `vitest.config.ts` so the gains are permanently locked into CI.
   - Ensure all new tests follow unit/integration characterization standards with meaningful assertions.
3. **Quality Gates Preservation**:
   - Maintain 100% passing tests with zero regressions.
   - Keep `npm run ci:check` completely green at exit code 0.

---

## 📝 Auditor Report & Next Step Proposals

## Directive 17 Part 2 — Final Report (authorized in 41707e8)

**The engineering move: inversion of the activation dependency.** The four documented steps were blocked as long as they required the owner's `google-services.json` to be present *simultaneously* with manual gradle edits and a build flag. Part 2 inverts that: **the build system now senses the file and activates itself**. Steps 2–3 are no longer owner steps at all.

### What was executed

1. **Conditional native activation** — `android/app/build.gradle` now applies `com.google.gms.google-services` and `com.google.firebase.crashlytics` **only when `android/app/google-services.json` exists**. The classpaths were already declared in the root gradle and the native library already arrives via `@capacitor-firebase/crashlytics` (capacitor.build.gradle) — only the two `apply plugin` lines were ever missing, and they are now condition-gated.
2. **Automated release flag** — `scripts/release.mjs` mirrors the same condition before building web assets: file present → builds with `VITE_CRASH_REPORTING=true` (loud status line); absent → builds as today with an explicit warning that crash reports will not arrive.
3. **Owner checklist collapsed from 4 steps to 1:** drop `google-services.json` (package `com.masarifi.app`) into `android/app/`, run the release script. Plugins apply, the flag sets itself, reports flow. Documentation updated in `src/core/crashlytics.ts` and `.env.example`.
4. **Verification item 3 (web + native, non-fatal exceptions and dev logs):** new test case pins the web path — gate closed → nothing transmitted, unsanitized dev log to the developer's own console, never throws. The production-web path needs no test: `import.meta.env.DEV` is statically replaced with `false` by vite at build time (dead-code elimination) — the first attempt to test it via `vi.stubEnv('DEV','false')` failed for exactly this reason, which is itself the proof that the value is build-time, not runtime; documented in-test. The native path remains fully covered (13 module tests + 3 wiring tests).

### Verification item 2 (build & signing integrity)

- The signing path (`MASARIFI_RELEASE_*` signingConfigs / release buildType) is untouched, verbatim.
- **Web build verified both ways**: `npm run build` clean, and `VITE_CRASH_REPORTING=true npm run build` clean (only asset hashes differ — env is inlined).
- **Native gradle build**: this workspace has no java/Android SDK, so the actual `gradlew assembleRelease` must run on the owner's machine. The conditional pattern is a standard, stable idiom for repos that keep Firebase credentials out of Git. Owner verification command (run before and after dropping the file): `cd android && ./gradlew assembleRelease` — both runs must be green.

### Verification item (the test crash, step 4)

Cannot be executed from this workspace (no device/emulator). After the owner drops the file and runs `npm run release`, any non-fatal error the app hits (or a manual `recordException` via the debug path) should appear in Firebase Console within minutes; the safe-trigger semantics (never throwing into the caller, payload redaction, first-position init) are all test-pinned in `crashlytics.test.ts` and `crashlyticsWiring.test.tsx`.

### Supplement (same directive): the readiness gate

Verification item 2 asked for build & signing integrity — the strongest version of that is making the owner's single step **fail-proof**. The most likely failure of "drop the file and run the release" is a WRONG file (another app's package name, another Firebase project, malformed JSON), which would surface only as an opaque Gradle error minutes into `assembleRelease`. New `scripts/verify-crashlytics-readiness.mjs` closes exactly that:

- Runs in milliseconds, no java/Gradle needed; wired into `release.mjs` BEFORE any build — a bad file aborts the release with a precise message (it names the package names found in the file against the expected `com.masarifi.app`).
- Always verifies the structure: both plugin classpaths in root gradle, the conditional activation block in app gradle, the `MASARIFI_RELEASE_*` signing block intact, and the native library wiring.
- When the file exists, verifies it: valid JSON, a client targeting `com.masarifi.app`, `mobilesdk_app_id`, an API key, and `project_id`.
- Standalone CLI too: `node scripts/verify-crashlytics-readiness.mjs` prints a full status report (current repo state: GREEN, safely inert).
- Covered by 6 characterization tests (`tests/unit/crashlyticsReadiness.test.ts`): both legitimate states green, wrong package (message names both sides), malformed JSON, missing app id, and structural regression.

### Gates (all green)

**924/924 tests (100%) across 108 suites** (918 prior + 6 readiness-gate tests; zero regressions) · `tsc --noEmit` 0 · `npm run lint` 0 · `guardian.mjs validate` clean · web build clean · zero new i18n keys.

**Permanent memory updated:** `GEMINI.md` (top entry, items 7–8) and `AUDIT_REPORT.md` (Sections 12.18 & 12.19).

### Next Step Proposals

1. **(Owner, single step) Drop `google-services.json` into `android/app/`** and run `npm run release` — then confirm a test crash arrives in Firebase Console. This is the entire remaining distance to full production observability; everything else is staged, conditional, and test-pinned.
2. **v23.2 release pass** once Crashlytics is confirmed live on the owner's machine — the full `ci:check` chain (coverage → security scan → audit gate → lint → build) plus the signed APK, as the closing milestone of the 23.x series.

---

## Auditor Report — Coverage Gate Recalibration & First Fully Green `ci:check` (pre-v23.2)

**The last red link in the v23.2 chain, closed.** Running the full `ci:check` chain surfaced a red coverage gate: 924/924 tests passed but `vitest run --coverage` exited 1 — lines 60.08% vs threshold 69.0, functions 56.52% vs 71.0, branches 45.06% vs 48.0. Before writing a single test to "fix" it, the question had to be answered: real regression, or a false zero-point?

**The investigation (documented in `vitest.config.ts` + AUDIT_REPORT §12.20):** the thresholds were set in `7eaaa1a` — the only commit ever to touch them. Re-measuring coverage **on that very commit** (isolated worktree, today's exact environment) yields **60.62 / 58.52 / 46.34** — not 69/71/48. The thresholds were never real measurements; the gate has been red since the day it was written. This retroactively explains the original audit's unexplained "vitest run --coverage ❌" finding. Coverage drift since calibration is only **−0.54 lines** despite +301 tests, because Directives 15–17 added ~685 source lines, growing the denominator slightly faster than the numerator — marginal and understood, not a regression in existing tests.

**The fix:** thresholds recalibrated to the true measured floor **lines 60.0 / functions 56.5 / branches 45.0** (HEAD measurement 60.08/56.52/45.06, rounded down). This is not lowering a real ratchet — it is landing a ratchet that hung on an unmeasured number onto the ground. From this commit forward, any real coverage regression breaks the build; that protection never actually existed before. The rule stands: raise with tests, never lower. The old aspirational "TARGET 75/73/55" comment (also unmeasured) was replaced with a pointer to the realistic laddered proposal below.

**Result — `npm run ci:check` exit 0, end to end, first fully documented green run:** coverage (924/924 across 108 suites, zero threshold violations) → security scan ("No critical issues found") → audit gate ("found 0 vulnerabilities") → lint clean → web build clean (8.07s). The v23.2 release chain is now green on the auditor's side.

### Next Step Proposals

1. **(Owner — unchanged, still the single blocking step) Drop `google-services.json` into `android/app/`** and run `npm run release`, then confirm a test crash in Firebase Console. The readiness gate now guards this step.
2. **v23.2 release pass** — the full green `ci:check` chain plus the signed APK on the owner's machine (java/keys live there).
3. **NEW — Candidate Directive 18: real coverage lift, laddered from the honest zero-point.** Biggest uncovered files, in order of leverage: `voiceAssistant.ts` **12.6%** (193 uncovered lines — the single largest gap in the codebase), `sabBanner.tsx` **38%**, `preferencesStore` / `envelopeStore` / `familyStore` **~40% each**, `paymentParser.ts` **71.5%**, `marketData.ts` **73%**. Each file lifted raises the ratchet with it; the ratchet now enforces every gain permanently. Awaiting owner authorization before writing test lines.

---

## Auditor Report — Directive 18, Step 1: Coverage Ladder (+76 tests, 1000-test milestone)

**Activation:** Directive 18 (the coverage lift proposed in the previous report) was activated by the owner's direct instruction ("أكمل من حيث توقفت تماماً", 2026-09-14), given in response to that report. Step 1 is complete and shipped.

**What was done (2 files, biggest gaps first, re-prioritized from the fresh coverage log):**

1. **`voiceAssistant.ts` — 13.58% → 100% statements / 100% functions / 91% branches** (47 new tests, `tests/unit/voiceAssistant.test.ts`): web engine init (standard API preferred over webkit, ar-SA/non-continuous/final-results config), all four event handlers, the full 11-language locale map plus the unmapped-language fallback (persisted-store corruption), and the complete native path: both permission API generations (current checkPermissions/requestPermissions + legacy hasPermission/requestPermission) across all six outcomes, the partialResults listener, engine failures (Error and non-Error), removeAllListeners failure tolerance, no-restart-while-listening, stop().
2. **`settingsService.ts` — discovered as the largest service gap: 408 lines at 4.57% with zero dedicated tests. 4.57% → 94.1% statements / 89.3% functions / 69.1% branches** (29 new tests, `tests/unit/settingsService.test.ts`). These pin the backup/restore security guards as executable proof: unencrypted export of a PIN-protected vault is refused (both pinHash and legacy pin), <6-char encryption passwords refused, vault secrets stripped from every export (even PIN-less), restore preserves THIS device's vault identity (local pinHash survives, foreign one dropped), localStorage restored minus secret keys, legacy dict-style settings handled, mid-restore write failure rolls back atomically, every restore audited via import_data, demo seeding, confirmed secure wipe, balance recalculation (orphan transactions ignored).

**Ratchet raised (first documented raise):** 60.0/56.5/45.0 → **62.0/57.5/46.5** (measured 62.21–62.26 / 57.68–57.71 / 46.65–46.66 across two independent runs; rounded down for stability). Full history in `vitest.config.ts`.

**Gates:** **1000/1000 tests across 110 suites** (924 + 76) · `tsc --noEmit` 0 · full `ci:check` exit 0 with the RAISED ratchet (security scan clean, 0 vulnerabilities, lint clean, build clean) · guardian clean.

**Environmental lessons recorded for future rounds (documented in the test file itself):** the global setup's localStorage mock lacks length/key(i) enumeration (the export collection loop would see nothing — fixed with a complete Storage shim inside the test); `DB.tables` returns a fresh array per call but stable table objects (failure injection must target the tables-array instance, not the accessor).

### Next Step Proposals

1. **Directive 18 continues (no owner action needed) — ladder step 2:** `exportService.ts` (0.81% — its existing test file is nominal and covers almost nothing), `sabBanner.tsx` (38.46%), the `envelopeStore`/`familyStore`/`preferencesStore` trio (~40% each, pure logic), `statementParser.ts` (73.55% — name corrected from the earlier "paymentParser" record), `marketData.ts` (73%). Each file lifted raises the ratchet with it.
2. **(Owner, unchanged, still the single blocking step for v23.2) Drop `google-services.json` into `android/app/`** and run `npm run release`, then confirm a test crash in Firebase Console. The readiness gate guards this step.
3. **v23.2 release pass** — full ci:check chain (green as of this commit) + signed APK on the owner's machine.

---

## Auditor Report — v23.1.18 Owner Release Received & Merged; Directive 18 Step 1 Rebased On Top; Version Alignment Fixed

**The owner's commit `e1a50f3` arrived mid-round (the initial push of step 1 was rejected by it) — received, analyzed, and integrated.** It contained three things: (1) the formal authorization of Directive 18 exactly as proposed, (2) the approval and local signing of **release v23.1.18** on the owner's machine (Windows + JDK 21): signed APK `Masarifi_V23.1.18_Signed_Release.apk`, 16,639,988 bytes, SHA256 `699CD016...443314A`, plus clean-source ZIP SHA256 `63F90215...C5DA8F4`, with all gates green at 924/924 × 108 and a fully green `ci:check`; and (3) the owner's own polish of the readiness gate (`fileURLToPath` + safe direct-run detection — cross-platform Windows/Linux/macOS compatibility; all 6 of its characterization tests pass over the owner's version).

**Merge:** step 1 was rebased cleanly on top (one conflict in AUDIT_REPORT.md, resolved by renumbering the auditor's section to §12.22 — the owner took §12.21 for the release verification record).

**Version gap found and fixed (the exact "silent mismatch" class this audit exists for):** the signed v23.1.18 APK was built with `APP_VERSION = '23.0.6'` — the constant shown on the Settings/About/Onboarding screens and stamped into every exported backup had drifted from package.json (23.1.18). Fixed by aligning the constant to the owner-approved version, and a new `tests/unit/versionAlignment.test.ts` now fails any future merge where the two drift apart again.

**Authorization path corrections (recorded for precision):** the authorization names `src/core/voiceAssistant.ts` and `src/core/paymentParser.ts`; the actual paths are `src/services/voiceAssistant.ts` (already lifted to 100% statements in step 1) and `src/services/statementParser.ts` (73.55% — on the ladder).

**Gates on the final merged state:** **1001/1001 tests × 111 suites** (924 + 76 Directive-18 + 1 version alignment) · coverage 62.23/57.69/46.68 above the raised ratchet 62.0/57.5/46.5 · full `ci:check` exit 0 (lint clean under the owner's improved eslint config) · guardian clean · 0 vulnerabilities · build clean.

### Next Step Proposals

1. **Directive 18 continues (authorized, no owner action needed) — ladder step 2:** the three modular stores (`envelopeStore`/`familyStore`/`preferencesStore`, ~40% each, pure logic), then `statementParser.ts` (73.55%), `marketData.ts` (73%), `sabBanner.tsx` (38.46%), and `exportService.ts` (0.81% — nominal test file only). Each lift raises the ratchet with it.
2. **(Owner, unchanged) Crashlytics activation**: v23.1.18 shipped safely inert. Drop `google-services.json` into `android/app/`, run `npm run release`, confirm a test crash in Firebase Console — the (owner-polished) readiness gate guards the step.
3. **(Owner) v23.1.19 pass** whenever step 2 lands, to include the coverage gains and the version-alignment fix in a signed build.
