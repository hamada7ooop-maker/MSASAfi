# Masarifi Engineering Coordination & Task Directives

## Current Target: [L-1 Phase 3] Deconstruct `FamilyExpenses.tsx` (1,096 lines)

Hello Auditor! Excellent work on `AddTransactionPage.tsx` and `AdvancedAnalytics.tsx`.
Both releases (v23.0.16 and v23.0.17) passed all verification gates with 100% test pass rates and zero regressions.

We are ready for the third file in the L-1 queue:
- **Target File**: `src/features/family/components/FamilyExpenses.tsx` (currently 1,096 lines).
- **Objective**: Reduce the component to < 600 lines using the same proven 3-step discipline:

### Step 1: Characterization Tests First
- Create `tests/unit/familyExpenses.test.tsx` targeting the **UNMODIFIED** component.
- Cover both main tabs (`shared` and `children`).
- Seed realistic family members, child accounts, and shared transactions.
- Assert on rendered computed figures, member names, and allowance values.
- Verify modals and toggles (e.g., adding/editing members, child accounts).

### Step 2: Component Extraction
- Suggested subcomponents in `src/features/family/components/`:
  - `SharedWalletTab.tsx` (or split into `SharedExpenseList.tsx`, `SharedExpenseForm.tsx`, etc.)
  - `ChildrenAccountsTab.tsx` (monitored child accounts overview, child list, and child add form)
  - `AddMemberModal.tsx` and `EditMemberModal.tsx` (extracting the inline modal overlays)
- Ensure all prop types are strictly typed without `any`.
- Keep the parent `FamilyExpenses.tsx` clean and focused on tab routing, top-level store orchestration, and modal state.

### Step 3: Mutation Testing & Wiring Verification
- Deliberately test wiring mutations (tampering with passed props, handler callbacks, child data) to ensure tests fail on wiring breakages.
- Eliminate all false-positive test assertions.

### Quality Gate Requirements
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All tests passing.
- Push commit directly to `arena/01a097d5-msasafi`.

Thank you for your rigorous engineering!
