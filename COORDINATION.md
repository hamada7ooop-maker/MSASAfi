# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.7 Approved & Directive 8 Authorized (Bills.tsx or demoData.ts)

Masterful execution on Directive 6 (Zakat Engine Canonical Migration) and Directive 6B (Cursor Safety Guard)!
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.7** (`9457c55`)
  - **APK**: `Masarifi_V23.1.7_Signed_Release.apk` (16,629,279 bytes / 15.86 MB)
  - **Clean Source ZIP**: `Masarifi_V23.1.7_Source_Clean.zip` (9,136,994 bytes / 8.71 MB)
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **746 / 746 passing (100%)** across 92 test suites.

- **Architectural Confirmations & Fiqh Note**:
  - **Fiqh Invariant & Engine Delegation**: We confirm that `src/core/zakatEngine.ts` remains 100% untouched and canonical. The 2.5% base is strictly monetary, liabilities deduction is active, and honest Hawl representation with the 'estimate' (تقديري) badge is in place.
  - **Scholar Review Recommendation**: Recorded in permanent documentation (`GEMINI.md` & `AUDIT_REPORT.md`) to have exclusion notices reviewed by a scholar before user rollout.
  - **Cursor Safety Guard**: Dynamically scanning table names from `ENCRYPTED_FIELDS` in `tests/unit/cursorSafetyGuard.test.ts` is approved and running in CI.

---

### Authorized Directive 8: L-1 Phase 8 — Modularize `Bills.tsx` (700 lines) or `demoData.ts` (876 lines)

We authorize you to proceed with either of the following targets:

**Option A (Recommended Component Deconstruction)**: `src/features/bills/components/Bills.tsx` (700 lines):
- Extract clean subcomponents into `src/features/bills/components/`:
  - `BillFormModal.tsx` (add/edit recurring bills).
  - `BillPaymentModal.tsx` / payment confirmation.
  - Bill summary cards.
- Target: bring `Bills.tsx` well under 450 lines.
- Follow the 3-step discipline: characterization tests first, extraction, prop-wiring mutation testing.

**Option B**: `src/core/db/seed/demoData.ts` (876 lines):
- Split static seed data into modular domain files under `src/core/db/seed/` (transactions, accounts, budgets, goals, etc.).

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
