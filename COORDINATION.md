# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Releases v23.1.4, v23.1.5, v23.1.6 Approved & Directive 6 Authorized (Zakat Engine Canonical Migration)

Sensational work across all three milestones!
- **Release Verification (All Built, Signed & Tested Locally)**:
  - **v23.1.4** (`22ba7ff`): ZakatCalculator deconstructed (964 -> 423 lines, -56%, 712 tests).
  - **v23.1.5** (`a924a79`): AdvisorPage deconstructed (930 -> 573 lines, -38%, 721 tests).
  - **v23.1.6** (`df7de78`): Critical DB Cursor Integrity Defect resolved + TravelBudget deconstructed (923 -> 580 lines, -37%, 734 tests).
  - **Current Production APK**: `Masarifi_V23.1.6_Signed_Release.apk` (16,623,483 bytes / 15.85 MB)
  - **Current Clean Source ZIP**: `Masarifi_V23.1.6_Source_Clean.zip` (9,125,028 bytes / 8.70 MB)
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean.
  - **Tests**: **734 / 734 passing (100%)** across 91 test suites.

- **Architectural Commendations**:
  - **The Cursor Integrity Fix**: Discovering that `openCursor`'s async `continue()` and cached `value` corrupted row reads (t1, t1, t2, t3) is monumental. Eliminating the proxy and refactoring `Table.filter()` call sites to `toArray()` with rigorous power-of-2 mathematical tests secures the core database layer.
  - **State Ownership**: Relocating all six `useState` hooks inside `RetirementSimulator.tsx` and extracting `TripFormModal.tsx` / `data/travelFallbacks.ts` successfully brought both God components well under the 600-line ceiling.

---

### Authorized Directive 6: Zakat Engine Canonical Migration & Fiqh Correctness

**Mandate**: **We 100% authorize and mandate the Zakat Engine migration!**
As you correctly diagnosed, over-charging users 2.5% on livestock, crops, and exempt property while ignoring liabilities and Hawl is a severe religious and calculation defect.

**Implementation Specifications**:
1. **Wire the UI to `src/core/zakatEngine.ts`**:
   - Refactor `ZakatCalculator.tsx` (and child components as needed) to delegate all calculations to canonical `calculateZakat()`.
   - Ensure monetary base for 2.5% applies to cash, gold, silver, investments, and trade goods.
   - Support deducting liabilities (debts).
   - Correctly represent Hawl.
   - For non-monetary categories (livestock, agriculture/crops), ensure the UI reflects their authentic Fiqh rulings rather than lumping them into a flat 2.5%.
2. **Update Characterization & Unit Tests**:
   - Invert the `CURRENT BEHAVIOUR` characterization test in `tests/unit/zakatCalculator.test.tsx` to assert the canonical Fiqh calculations.
   - Add explicit test assertions verifying liabilities deduction and asset exclusions.
3. **Table.filter / Table.each Safety Guard (Directive 6B)**:
   - Add an ESLint rule or check to forbid calling `Table.filter()` or `Table.each()` on Dexie tables with encrypted fields to prevent future silent row corruptions.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before pushing.

---

### 📌 Backlog Note: Secure CVV Storage & Reveal Mechanism
- Add optional 'Reveal CVV 👁️' capability in Bank Cards behind biometric / PIN auth and AES-GCM encryption in `encryption.ts`. Scheduled post-modularization.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
