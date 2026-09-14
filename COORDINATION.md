# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.9 Approved & Directive 10 Authorized (Settings.tsx Modularization)

Brilliant execution on Directive 9! Both the accessible-name a11y harness for Bills and the surgical deconstruction of `Challenges.tsx` were completed to the highest engineering standards.
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.9** (`2000c14`)
  - **APK**: `Masarifi_V23.1.9_Signed_Release.apk` (16,630,091 bytes / 15.86 MB) — SHA256: `FD19348B3106A0CE027663E5E6170DE8191F53D26D89068FA1DDD02EF4AC87A4`
  - **Clean Source ZIP**: `Masarifi_V23.1.9_Source_Clean.zip` (9,159,501 bytes / 8.74 MB) — SHA256: `D76E0973AEF9C97A1A1C3661385F6AE82C817A9EC4CC867D080B3D667B20E473`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **783 / 783 passing (100%)** across 95 test suites.

- **Architectural Findings & Approvals**:
  - **Component Size Win**: `Challenges.tsx` dropped from **693 to 381 lines (-45%)**, hitting the target. Clean extraction of `ChallengeModal.tsx` (142), `CustomChallengesTab.tsx` (138), `Week52Tab.tsx` (97), and `NoSpendTab.tsx` (77).
  - **A11y Rigor**: Approved the accessible-name test suite in `billsA11y.test.tsx` and the addition of `aria-label`, `aria-pressed`, and `aria-hidden="true"` on decorative icon spans.
  - **Mutation Driver Post-Mortem**: Acknowledged and commended your vigilance in catching the parser bug where total suite failure was misreported as zero failures. The 13/13 mutation kill rate is confirmed.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.24) have been updated with v23.1.9 release data.

---

### Authorized Directive 10: L-1 Phase 10 — Modularize `Settings.tsx` (670 lines)

We authorize you to proceed with **Option A (Recommended)** or **Option B**:

#### Option A (Recommended): `src/features/settings/components/Settings.tsx` (670 lines)
`Settings.tsx` currently contains:
1. Reusable primitives: `SettingsCard` and `SectionGroup` (lines 25-108) -> can move to a shared file or `components/primitives.tsx`.
2. Developer mode & unlock logic (lines 118-230) -> can be extracted into `DevUnlockModal.tsx`.
3. Search configuration & index table (lines 236-450) -> a large static search matrix that belongs in a separate file (e.g. `data/settingsSearchIndex.ts` or `hooks/useSettingsSearch.ts`).
- **Target**: Bring `Settings.tsx` under 320 lines.

#### Option B: Domain Logic Modularization
- `src/core/gemini.ts` (680 lines): modularize into sub-services (prompts, client, parsers).
- Or `src/features/cards/data/cardConstants.ts` (776 lines).

#### Quality Discipline:
1. **Characterization Tests**: Ensure existing settings rendering, search filtering, and developer actions have tests in place.
2. **Modular Extraction**: Keep state and effects localized.
3. **Prop-Wiring Mutation Testing**: Ensure 100% mutant kill rate on extracted components.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
