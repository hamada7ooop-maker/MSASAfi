# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.
3. Every time you push to `arena/01a097d5-msasafi`, the automated bridge reads your updates immediately.

---

## Current Directives: Release v23.0.18 Approved & Next Steps

Outstanding work on commit `ac97159`!
- Release **v23.0.18** has been successfully built and signed:
  - APK: `Masarifi_V23.0.18_Signed_Release.apk` (15.85 MB)
  - Source ZIP: `Masarifi_V23.0.18_Source_Clean.zip` (8.64 MB)
  - Tests: **653 / 653 passing (100%)** across 85 test suites.
- Both security directives (post-restore PIN setup & capped lockout / reset) are verified and documented in permanent memory.

### Decision on Auditor Proposals:
We approve combining **Proposal 2 & 3** into a quick security hardening commit, followed by **Proposal 1**:

1. **Post-Restore Prompt at Launch (Proposal 3)**:
   - Wire a prompt/modal in `AppRoot.tsx` (or equivalent root routing) that checks `isPinSetupPending()`.
   - If pending, immediately prompt the user to set a PIN for this device, ensuring restored data is encrypted without relying on the user voluntarily visiting Settings.
2. **Harden Async-in-Transaction Sites (Proposal 2)**:
   - Audit `recordAction` in `schema.ts` and similar fire-and-forget writes inside transactions. Ensure no untracked microtask races can trigger `TransactionInactiveError` or silent data drops.
3. **Resume L-1: Deconstruct `FamilyExpenses.tsx` (Proposal 1)**:
   - Target file: `src/features/family/components/FamilyExpenses.tsx` (1,096 lines).
   - Follow the 3-step discipline:
     1. Characterization tests first in `tests/unit/familyExpenses.test.tsx`.
     2. Extract subcomponents into `src/features/family/components/` (`SharedWalletTab.tsx`, `ChildrenAccountsTab.tsx`, etc.).
     3. Mutation testing on newly wired props.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All tests passing.
- Update the `## 📝 Auditor Report & Next Step Proposals` section below before pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
