# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `
### 📌 Backlog Note (Future Enhancement): Secure CVV Storage & Reveal Mechanism
- **Feature Proposal**:
  - Add optional 'Reveal CVV 👁️' capability in Bank Cards.
  - **Security Requirements**:
    1. Include `cvv` in `ENCRYPTED_FIELDS` in `src/core/db/encryption.ts` so it is strictly AES-GCM encrypted in IndexedDB.
    2. Protect the reveal action behind biometric authentication (`BiometricService`) or Vault PIN fallback.
    3. Keep CVV masked by default (`•••`) to maintain PCI-DSS compliance and prevent shoulder-surfing.
  - *Status*: Scheduled for post-modularization phase.

---

## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.
3. Every time you push to `arena/01a097d5-msasafi`, the automated bridge reads your updates immediately.

---

## Current Directives: Release v23.1.3 Approved & Directive 5 Authorized (ZakatCalculator.tsx)

Superb work on `BankCardsManager.tsx`!
- **Release v23.1.3 Built and Signed**:
  - Full mandatory `@abc` release cycle completed and verified.
  - **APK**: `Masarifi_V23.1.3_Signed_Release.apk` (16,622,731 bytes / 15.85 MB)
  - **Source ZIP**: `Masarifi_V23.1.3_Source_Clean.zip` (9,093,572 bytes / 8.67 MB)
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean.
  - **Tests**: **695 / 695 passing (100%)** across 88 test suites.
- **Architectural Confirmations**:
  - `BankCardsManager.tsx` down to **546 lines (-50%)** with `AddCardModal.tsx` (630 lines) cleanly isolated.
  - State ownership relocation and resolving the stale-prefill PAN inheritance bug is a high-value fix.
  - Mutation test discipline (6/7 killed, equivalent survivor verified) fully approved.

---

### Authorized Directive 5: L-1 Phase 5 — Modularize `ZakatCalculator.tsx` (964 lines)

Target: `src/features/calculators/components/ZakatCalculator.tsx` (964 lines).

**Strict Constraint (Fiqh Rules Invariant)**:
We **100% approve and endorse** your proposal regarding `src/core/zakatEngine.ts`:
- All fiqh calculation logic MUST remain strictly untouched inside `src/core/zakatEngine.ts`.
- The deconstruction of `ZakatCalculator.tsx` must be **strictly presentational**.
- Characterize tests against the engine's canonical outputs rather than re-deriving fiqh values in tests.

Follow the 3-step discipline:
1. **Step 1: Characterization Test Harness First**:
   - Create `tests/unit/zakatCalculator.test.tsx` before modifying source.
   - Assert presentational tabs, asset inputs, hawl/nisab status cards, and total zakat payable display.
   - Verify the harness fails against intentional mutations on the original component.
2. **Step 2: Presentational Decomposition**:
   - Extract cleanly into `src/features/calculators/components/`:
     - e.g. category asset tabs, nisab summary banner, calculation breakdown view.
   - Target reduction: bring `ZakatCalculator.tsx` well under 550 lines.
3. **Step 3: Mutation Testing on Prop Wiring**:
   - Verify prop wiring with intentional mutations (swapped categories, inverted inputs).
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
