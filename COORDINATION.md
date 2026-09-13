# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.
3. Every time you push to `arena/01a097d5-msasafi`, the automated bridge reads your updates immediately.

---

## Current Directives: Release v23.1.2 Approved & Directive 4 Authorized (BankCardsManager.tsx)

Phenomenal engineering on `FamilyExpenses.tsx`!
- **Release v23.1.2 Built and Signed**:
  - Full mandatory `@abc` release cycle completed and verified.
  - **APK**: `Masarifi_V23.1.2_Signed_Release.apk` (16,622,627 bytes / 15.85 MB)
  - **Source ZIP**: `Masarifi_V23.1.2_Source_Clean.zip` (9,085,531 bytes / 8.66 MB)
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean.
  - **Tests**: **682 / 682 passing (100%)** across 87 test suites.
- **Architectural Decisions & Confirmations**:
  - **Decomposition approved**: `FamilyExpenses.tsx` down to **420 lines (-62%)** with state ownership cleanly relocated to `SharedWalletTab.tsx` (599 lines) and `ChildrenAccountsTab.tsx` (274 lines).
  - **Scope boundary approved**: We fully agree with stopping at 599 lines for `SharedWalletTab.tsx`. Splitting along natural cohesion seams is far superior to artificial line-chasing.
  - **Characterization & Mutation Rigor**: Outstanding discipline on the 10/11 mutant kill rate and verifying the 11th survivor as an equivalent mutant via byte-level DOM diffing.
  - **safeWaitFor Consensus**: Your analysis of the `fake-indexeddb` vs. native Blink transaction lifecycle divergence is documented in permanent project memory.

---

### Authorized Directive 4: L-1 Phase 4 — Modularize `BankCardsManager.tsx` (1,085 lines)

Target: `src/features/cards/components/BankCardsManager.tsx` (1,085 lines).

Proceed using the proven 3-step discipline:

1. **Step 1: Characterization Test Harness First**:
   - Create `tests/unit/bankCardsManager.test.tsx` before modifying source.
   - Assert card rendering, card selection/switching, balance displays, benefits modal, and transaction list.
   - Seed distinct non-round values and verify the harness can fail against intentional mutations on the original component.
2. **Step 2: Component Extraction**:
   - Extract subcomponents into `src/features/cards/components/`:
     - e.g. `CardVisual.tsx` / `CardDetailView.tsx` / `AddCardModal.tsx` / `CardBenefitsModal.tsx`.
     - Relocate local UI state ownership to the extracted components.
   - Bring `BankCardsManager.tsx` well under the 600-line threshold.
3. **Step 3: Mutation Testing on Prop Wiring**:
   - Verify prop wiring and handlers with intentional mutations (swapped card data, omitted mutator callbacks).
   - Target 100% kill rate on genuine mutants.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update the `## 📝 Auditor Report & Next Step Proposals` section below before pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
