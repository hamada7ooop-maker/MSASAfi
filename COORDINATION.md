# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.8 Approved & Directive 9 Authorized (Challenges.tsx Modularization & Bills a11y)

Exceptional work on Directive 8! The modularization of `Bills.tsx` was executed with great surgical precision and architectural honesty.
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.8** (`7e32690`)
  - **APK**: `Masarifi_V23.1.8_Signed_Release.apk` (16,629,239 bytes / 15.86 MB) — SHA256: `E7FC338B50ECB3AC68AFB6C5A186178B7A73A133526251C964FE87030CF462D4`
  - **Clean Source ZIP**: `Masarifi_V23.1.8_Source_Clean.zip` (9,146,287 bytes / 8.72 MB) — SHA256: `12A5562D3F87D141013F6D529C77E46950171F8CD33B75BD0DDA45AB2D50B06F`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **761 / 761 passing (100%)** across 93 test suites.

- **Architectural Findings & Approvals**:
  - **Component Size Win**: `Bills.tsx` reduced from **699 to 367 lines (-47%)**, beating the 450-line target. Clean extraction of `BillModal.tsx` (195 lines) and `SubModal.tsx` (167 lines).
  - **Mutation Testing Rigor**: Approved the 10/10 mutation testing outcome and the analysis of the equivalent mutant regarding `addBill` vs `updateBill` upsert behavior in Dexie.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.23) have been fully synced with the v23.1.8 release artifacts.

---

### Authorized Directive 9: L-1 Phase 9 — Modularize `Challenges.tsx` (693 lines) + Quick Bills a11y fix

We authorize you to proceed with:

#### Part 1: Quick Bills a11y labels (Low Hanging Fruit)
In `src/features/bills/components/Bills.tsx` and extracted modals, add proper `aria-label` and `title` to icon-only buttons (`add`, `edit`, `delete`) using appropriate localized keys or descriptive labels to ensure screen readers do not read raw ligature text.

#### Part 2: Main Target — Modularize `src/features/challenges/components/Challenges.tsx` (693 lines)
`Challenges.tsx` has three distinct sub-features and self-contained modals ready for extraction into `src/features/challenges/components/`:
1. **`ChallengeModal.tsx`**: Extract the inline `ChallengeModal` (lines 17-145) which contains its own form state, emoji selector, duration and progress inputs, and validation.
2. **Tab / Subcomponent Extraction**:
   - Extract the 52-Week Saver tab or component (`Week52SaverTab.tsx`) and/or No-Spend Day tab (`NoSpendDayTab.tsx`).
   - Or extract the custom challenge card / list rendering (`ChallengeCard.tsx`).
3. **Target**: Bring `Challenges.tsx` well under 380 lines.

#### Step-by-Step Quality Discipline:
1. **Characterization Tests**: Write unit tests covering existing challenges behavior, tab switching, and modal interactions before refactoring.
2. **Component Extraction & Clean Relocation**: Keep shared state clean; pass callbacks cleanly.
3. **Prop-Wiring Mutation Testing**: Test for missing props, unwired saves/deletes, or miswired tab events.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
