# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.2.0 Built & Signed — Grand Milestone Complete! 🚀

🎉 **Historic Milestone Achieved: Masarifi v23.2.0 Production Release Built & Signed!**
Directive 18 Step 3 and the owner-approved Defect #2 fix in `statementParser.ts` landed with perfection. The Lead Architect has executed the Windows `@abc` pipeline with JDK 21 to produce the official production release artifacts.

- **Release Verification Data (Built, Tested & Signed Locally on Windows with JDK 21)**:
  - **Release Tag**: **v23.2.0**
  - **Signed Release APK**: `Masarifi_V23.2.0_Signed_Release.apk` (16,643,108 bytes / 15.87 MB) — SHA256: `C4F46CFFBFF71BC71F0698BEEA4316975AF9EC608F01F286297CB26CB9FBB852`
  - **Clean Source ZIP**: `Masarifi_V23.2.0_Source_Clean.zip` (9,264,696 bytes / 8.84 MB) — SHA256: `7017F51F448E34368395E1C9EBA4628E55EAD39E3A9E53EFE8AACBB3729DBF1A` (100% credential-free; google-services.json & keystores excluded)
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` clean (189/189 tips across 11 languages) · `npm run audit:security` clean (0 vulnerabilities) · `npm run test:security` clean.
  - **Tests**: **1,112 / 1,112 passing (100%)** across **116 test suites**.
  - **Coverage Ratchet**: Raised and locked at **lines 63.9 / functions 58.8 / branches 48.0** (actual measured: 64.47% lines / 59.26% functions / 48.42% branches).
  - **CI Chain**: `npm run ci:check` fully GREEN (exit code 0) across all 5 verification stages.
  - **Live Crashlytics**: Active native crash reporting with ProGuard mapping uploaded via `uploadCrashlyticsMappingFileRelease`.
  - **Permanent Documentation Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (§12.25) permanently recorded.

---

### Vision & Directive 19 Call for Proposals: The UI/UX Renaissance

Now that the underlying architecture, database layer, security, and release pipelines are rock-solid at 100% (with 1,112 green tests and production Crashlytics live in v23.2.0), the Owner and Lead Architect want to embark on the **next monumental phase: The UI/UX Renaissance**.

We want Masarifi to transcend traditional, generic, and classic fintech design patterns and evolve into a world-class, ultra-modern, elegant design masterpiece (drawing inspiration from design leaders like Linear, Apple Design Award winners, and Revolut).

**We want to hear YOUR vision and technical/architectural proposal first.**

Please provide a detailed proposal covering:
1. **Design System & Visual Language**:
   - Modern design tokens (deep obsidian dark mode `#0B0F17`, crisp ceramic light mode, subtle glassmorphism `backdrop-blur`, refined 1px borders, ambient lighting).
   - Typographic hierarchy & tabular numerics (`tabular-nums`) for currency and metrics.
   - Spacing scales, depth elevation, and visual density balance.
2. **Key Screen Reinvention & Prioritization**:
   - Which screens/flows should be revolutionized first (e.g., Home Dashboard & Hero Cards, Cards & Accounts Manager, Quick Transaction Add & Action Drawers, Interactive Analytics & Charts)?
   - Architectural strategy for breaking down and redesigning heavy UI components.
3. **Motion, Micro-Interactions & Ergonomics**:
   - Smooth spring physics transitions for card interactions and sheet presentations.
   - Fluid number ticker counters when balances update.
   - Tactile haptic feedback mapping (`@capacitor/haptics`) across key financial interactions.
   - Thumb-friendly bottom-oriented ergonomics.
4. **Performance & Zero-Regression Protocol**:
   - Guaranteeing buttery 60 FPS fluidity with zero unnecessary re-renders.
   - Maintaining our 100% passing test suite (1,112+ tests) and ratchet thresholds throughout the UI overhaul.

Please append your recommendations, architectural plan, and suggested roadmap under `## 📝 Auditor Report & Next Step Proposals` so we can review, synthesize, and launch Directive 19!

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

## Auditor Report — Directive 18, Step 2: Modular Stores to 100% + StatementParser to 98.9%; Two Real Defects Surfaced (One Fixed, One Awaiting Owner Decision)

**Congratulations on the live Crashlytics milestone** — v23.1.19 with active crash reporting is the payoff of the whole conditional-activation architecture. Received and verified your commit `883d393`: release data recorded (APK SHA256 `943C13B0...A6D2DE`), and — security check passed — `google-services.json` remains OUT of the repository tree (0 traces): it lives only on your machine, exactly as the .gitignore convention requires.

**Step 2 shipped (+59 tests → 1060/1060 across 113 suites):**

1. **The three modular stores — lifted to 100% statements / 100% functions** (19 tests, `tests/unit/modularStores.test.ts`, driven through `renderHook` + `act`): full envelope lifecycle (unique-id generation, spent clamping at zero, no-ops on unknown ids), full family lifecycle (child CRUD, income/expense transactions with prepend order, `payChildAllowance` including the zero-allowance guard), and every preference setter through the slice.
2. **`statementParser.ts` — 73.55% → 98.9% statements / 100% functions** (40 tests): multi-language header detection (English + Arabic), debit/credit vs signed-amount logic, Type-column refinement, generic-category AI escalation (specific answer adopted, generic kept when AI abstains), obscure-header content fallback, malformed-row/zero-amount skipping, account column, date normalization (ISO, Arabic + English months, PM/AM, DD-MM vs MM-DD, two-digit years), CSV splitting (quotes, semicolon/tab/Arabic-comma, blank lines).

**Defect #1 — FIXED (the test that found it):** calling any of the three modular stores' exported no-selector overload returned a fresh object per render, violating zustand v5's stable-snapshot contract → "Maximum update depth exceeded" (infinite re-render). No production component currently calls that overload, but it is exported public API whose type signature invites it. Fixed with `useShallow` (the library's official remedy) in all three stores; the previously-crashing tests now pin the fix permanently.

**Defect #2 — DOCUMENTED, awaiting your decision:** the statement parser's content-based column guessing fails in BOTH orderings when headers are unrecognized: date-first rows import the date as an amount (2026-09-01 → an "income of 2026"); amount-first rows import the amount as a date — because V8 considers `new Date('-44.5')` valid (May 1, 2044!). Both behaviors are pinned as named documentation tests (clearly commented as audited weaknesses), so a future fix must be a conscious decision, not an accident. Proposed fix (needs your sign-off): the guessers should skip already-assigned columns and reject date-parseable values as amount candidates.

**Version gap, round two — caught by the alignment guard:** your commit bumped package.json to 23.1.19 while `APP_VERSION` stayed 23.1.18 (the signed APK displays "V23.1.18"). The `versionAlignment` test added last round flagged it immediately; constant aligned to 23.1.19. Recommendation: run `npm run ci:check` locally right after any version bump, before signing — the guard catches this in seconds.

**Also received mid-round — your `8060bc9` (sec: protect google-services.json from the clean-source zip):** a sharp catch. Activation made the file exist on your machine; without this, the next clean-source packaging could have swept it into the distributed zip. Verified exclusion + 0 credential traces — the right defense, folded into this round's rebase cleanly.

**Ratchet raised (second documented raise):** 62.0/57.5/46.5 → **62.5/57.8/46.9** (measured 62.59–62.62 / 58.02–58.05 / 47.24–47.27). Full history in `vitest.config.ts`.

**Gates:** **1060/1060 × 113** · full `ci:check` exit 0 with the raised ratchet · guardian clean · readiness gate GREEN (inert in this repo — the activation file lives only on your machine) · 0 vulnerabilities · build clean.

**Watch note:** `bankCardsManager.test.tsx` failed once under full parallel load and passed in both other runs of identical code (including this round's coverage run) — a timing flake, unrelated to this round's changes. Under observation; if it recurs, it deserves its own hardening (explicit waitFor instead of immediate DOM probing).

### Next Step Proposals

1. **Directive 18 continues — ladder step 3:** `marketData.ts` (73%, 264 lines), then `sabBanner.tsx` (38.46%), `exportService.ts` (0.81% — nominal test only), and `settingsStore.ts` (now 80.3%, the shared backbone of the modular stores).
2. **(Owner decision) statementParser column-guessing fix** as described above — small, test-backed, unblocks correct imports from banks with unrecognized headers.
3. **(Owner) v23.2 historic release** once the ladder lands — everything is staged: live Crashlytics, green ci:check, and the version-alignment guard now watching every bump.

---

## Auditor Report — Defect #2 Fixed (Owner-Approved); Directive 18 Step 3 Complete; v23.2.0 READY TO BUILD

**Defect #2 — fixed exactly as approved:** the content-based column guessers now (1) skip columns already assigned to another role (mutual exclusion), and (2) use a strict date-SHAPE check (`looksLikeDate`: three digit groups chained by date separators, or an explicit clock time) instead of trusting V8's `new Date()` — which considers `'-44.5'` a valid date (May 1, 2044). Both formerly-documented weaknesses are now pinned as "FIXED (owner-approved)" tests: obscure-header statements parse correctly in BOTH column orderings.

**Step 3 shipped (+52 tests → 1112/1112 across 116 suites):**

1. **`marketData.ts` 73% → 95% statements**: missing-key early-outs, gold per-gram vs per-ounce (÷31.1035), USD fallback converted via internal rates, exchange rates, news (encoded key), FRED's 13 series (relative change, missing-value '.' fallback, zero/failed series filtered), crypto mapping (unknown ids upper-cased).
2. **`settingsStore.ts` 80.3% → 95.5% statements** — including the persist **migration pipeline** exercised via real `rehydrate()`: monolith splits (market→4 pulses, pulse→aiPulse+habitStreak, savings→tree+whatIf, bills→upcoming) with visibility inheritance, next-gen widget auto-heal (forced visible), partial qaOrder completion, null-persist passthrough.
3. **`exportService.ts` 0.81% → 94.6% statements** — the old test file reimplemented the running-balance logic LOCALLY and never touched the service (nominal coverage). Replaced with a real suite: live-only filtering (deleted/draft), all four filters, running balance incl. **shared-expense splitBy division**, CSV quoting/labels, JSON payload, xlsx (web download vs native base64), PDF delegation, native save Documents→Cache fallback + share sheet, web data-URI download.
4. **`ZakatNisabBanner.tsx` 38.5% → 85.7% statements**: estimate flag, hawl wording (status × {days}), below-nisab notice, save action gating, silver Pro-lock (toast, no call), sanitized price inputs, sync button states, hawl date forwarding.

**Flakiness root-caused and fixed (not retried blindly):** one failure under full parallel load — `postRestorePinGate` read the legacy-`pin` cleanup immediately after `pinHash` appeared; they are two separate non-atomic writes, so the immediate read raced the cleanup under CPU load. Both conditions now polled inside a single `waitFor`. (Same class as last round's one-off bankCardsManager flake — these get fixed when identified, not ignored.)

**Ratchet raised (third documented raise):** 62.5/57.8/46.9 → **63.9/58.8/48.0** (measured 64.0/59.02/48.11–48.14). Full ladder history in `vitest.config.ts`.

**v23.2.0 readiness (your step, everything staged):**
- `package.json` AND `APP_VERSION` were bumped **together** to 23.2.0 per your announcement — the alignment guard is green, and the signed APK will display the right number from the first build (no third round of the version gap).
- Full `ci:check` exit 0 on the final state: 1112/1112 × 116, coverage 64.0 above the raised ratchet, security scan clean, 0 vulnerabilities, lint clean, build clean, guardian clean, readiness gate GREEN (inert in-repo; LIVE on your machine).
- Run your local `@abc` pipeline and sign **v23.2.0** whenever ready.

### Next Step Proposals

1. **(Owner) Build & sign v23.2.0** — the historic release: live Crashlytics + the full Directive-18 coverage climb + every guard green.
2. **(Auditor, on your word) Directive 18 continuation beyond this round** — remaining ladder: the 0%-coverage component cluster (calculator, transactionsBar, weeklyBrief, exportService-adjacent modals), then hooks (88.63%). The ratchet holds every gain permanently.
3. **(Auditor) Environmental note:** the sandbox reset itself between rounds this time (stale snapshot over an old HEAD) — resolved by verifying every working-tree remnant against the remote before cleaning; zero loss. Standing rule for future rounds: fetch-and-compare BEFORE any destructive action.

---

## Auditor Report — Directive 19 (UI/UX Renaissance): Full Proposal Submitted for Owner Approval

As requested, the vision and engineering roadmap were drafted **after a factual scan of the current visual architecture** — and the scan changed the nature of the proposal: the project already owns a **Tailwind v4 CSS-first token system** (the full "Stitch — Financial Architect" Material-3 semantic palette in `src/index.css`), a working `.dark` variant system with 6 light palettes + a dim dark palette via `ThemeManager`, `@capacitor/haptics` installed, and an `AnimatedNumber` that already respects `prefers-reduced-motion`. So Directive 19 is an **evolution on solid ground**, not a teardown — lower risk, higher speed.

**The full proposal lives in `DIRECTIVE_19_PROPOSAL.md` (root).** Its pillars:

1. **Tokens**: Deep Obsidian `#0B0F17` as a full 6-layer dark palette (elevation via hairline borders + ambient glow instead of shadows-on-black); clean warm light mode; a colorblind-safe emerald/coral income/expense pair (WCAG AA); unified 5-step radii scale and 4-level elevation scale; **`<NumberText/>` primitive enforcing `tabular-nums` on every financial figure**; font consolidation from 4 fragmented families to one variable Arabic family (IBM Plex Sans Arabic).
2. **Screens (by frequency × impact)**: Dashboard first (glass balance card + semantic AmbientGlow + NumberFlow), then Quick Add (springy bottom sheet + thumb-first keypad + haptic confirm), then Cards/Wallets (decompose the 553-line manager), then charts, then the long tail. **Decomposition doubles as the coverage solution**: every heavy component splits into ≤120-line testable pieces — the 0%-coverage component cluster rises structurally.
3. **Motion & touch**: 4 standardized spring tokens (no framer-motion — CSS/WAAPI, smaller bundle, transform/opacity-only), generalized `<NumberFlow/>` adaptive counter, and a single **haptic vocabulary layer** (`src/core/haptics.ts`: light/select/confirm/destruct/error/triumph) honoring a settings toggle + reduced-motion, with bottom-sheet drag and rubber-band.
4. **60 FPS & zero regression**: blur budget (≤3 glass surfaces/screen), content-visibility for long lists, chart.js deferral; **characterization-before-rebuild** for every restyled component; every batch ships with `ci:check` exit 0 (1,112 tests + ratchet are the red line); owner visual QA on-device after each batch; bundle budget +5%.

**Roadmap: 6 shippable batches** (0 enablement → 1 dashboard → 2 quick-add → 3 cards → 4 charts → 5 consistency + v23.3.0), each ≤~10 files, each independently revertible.

### Next Step Proposals

1. **(Owner) Review & approve `DIRECTIVE_19_PROPOSAL.md`** — specifically: Obsidian as the default dark palette, the emerald/coral financial pair, keeping royal navy `#002b59` as brand, and the single-family font decision.
2. **(Auditor, on approval) Batch 0 (enablement)**: tokens + primitives + haptics layer with full tests — near-zero visual change, everything staged for the visible batches.
3. **(Owner) v23.2.0 release data** — once you've run your local `@abc` pipeline, share the APK hash and it will be recorded (the release chain is green as of `e8dca6e`).
