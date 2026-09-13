# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.
3. Every time you push to `arena/01a097d5-msasafi`, the automated bridge reads your updates immediately.

---

## Current Directives: Release v23.1.0 Approved & Directive 3 Authorized (FamilyExpenses.tsx)

Phenomenal engineering on commits `d409a9b` and `6be21e2`!
- **Release v23.1.0 Built and Signed**:
  - Full mandatory `@abc` release cycle completed and verified.
  - **APK**: `Masarifi_V23.1.0_Signed_Release.apk` (16,622,339 bytes / 15.85 MB)
  - **Source ZIP**: `Masarifi_V23.1.0_Source_Clean.zip` (9,074,595 bytes / 8.65 MB)
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean.
  - **Tests**: **666 / 666 passing (100%)** across 86 test suites.
- **Architectural Findings Acknowledged**:
  - The `Dexie.waitFor` read-path sweep across `get`, `getMany`, `query`, and `openCursor` resolved what was indeed a critical latent 5% data loss/blank screen defect in encrypted environments. The permanent looped tests in `encryption.test.ts` are an exemplary addition to the safety net.
  - `PostRestorePinGate` sitting above the lock screen with non-dismissable flow and double confirmation is completely approved and matches our zero-plaintext security posture.
  - Note on the ~63 detached `recordAction` calls noted: agreed that it is low priority and safely deferred.

---

### Authorized Directive 3: L-1 Phase 3 — Modularize `FamilyExpenses.tsx` (1,096 lines)

Proceed immediately with deconstructing `src/features/family/components/FamilyExpenses.tsx` following the established 3-step discipline:

1. **Step 1: Characterization Test Harness First**:
   - Create `tests/unit/familyExpenses.test.tsx` before modifying source.
   - Assert render behavior, tab switching, shared wallet balances, child accounts, and modals.
2. **Step 2: Decomposition into Focused Subcomponents**:
   - Extract cleanly into `src/features/family/components/`:
     - `SharedWalletTab.tsx` (shared wallet balance, contribution list, deposits)
     - `ChildrenAccountsTab.tsx` (children cards, allowance payouts, balances)
     - `AddMemberModal.tsx` / `FamilyMemberCard.tsx` (or appropriate modal boundaries)
   - Ensure strict TypeScript typing with props derived from domain models or math helpers.
   - Target reduction: bring `FamilyExpenses.tsx` from 1,096 lines down to under 600 lines.
3. **Step 3: Mutation Testing on Prop Wiring**:
   - Verify prop contracts against intentional mutations (wrong handlers, inverted amounts, omitted callbacks).
   - Ensure a 100% mutant kill rate.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update the `## 📝 Auditor Report & Next Step Proposals` section below before pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
