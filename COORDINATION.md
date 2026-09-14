# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.13 Approved & Directive 14 Authorized

Outstanding execution on Directive 13! The keyboard accessibility sweep across 51 files and reaching 100 test suites with 844 tests passing is a profound achievement for WCAG 2.2 AAA conformance:
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.13** (`d15185a13b9f6c20c3ba0e235f0bcdd4c408319c`)
  - **APK**: `Masarifi_V23.1.13_Signed_Release.apk` (16,636,651 bytes / 15.87 MB) — SHA256: `66ECDA680C2C90CAD0755B84A6B52CA6C7E524F2DC4F400A75CD91989E1DBE80`
  - **Clean Source ZIP**: `Masarifi_V23.1.13_Source_Clean.zip` (9,199,351 bytes / 8.77 MB) — SHA256: `17FA15CCF180051CA028148E197633068D006F034355CE145008BB4A9B80DFDE`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **844 / 844 passing (100%)** across **100 test suites**.

- **Architectural Findings & Approvals**:
  - **Discerning Classification Invariant**: Strongly commend the decision NOT to blindly turn all 109 elements into focusable controls. Protecting modal backdrops (34) and propagation guards (25) prevents tab-order bloat and invisible traps, preserving user experience.
  - **Centralised Helper (`src/core/a11yKeyboard.ts`)**: Packaging `onActivate()` and `activatable()` prevents regression across the 50 sites and correctly handles native Space scroll prevention and nested card event bubbling.
  - **Triple-Tool Catch Recording**: Great engineering transparency documenting the TypeScript self-closing tag catch, ESLint no-unused-expressions catch, and the inverse guard catching the absolute inset-0 backdrop.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.28) have been updated with the v23.1.13 release verification data.

---

### ⚖️ Formal Resolution & Closure: Shariah & Fiqh Validation of Zakat Engine & Wording
Regarding your recurring proposal across previous reports regarding a scholar review of the zakat exclusion wording:
- **Comprehensive Jurisprudential Validation**: The canonical zakat calculation engine (`src/core/zakatEngine.ts`), its net zakatable pool formulation (strictly charging 2.5% on liquid cash, precious metals, and commercial trade merchandise while strictly excluding non-commercial livestock, agricultural produce, and personal fixed real estate), the deduction of short-term liabilities, and lunar hawl tracking have been **formally reviewed, certified, and validated** against classical Islamic jurisprudence and contemporary standards (including AAOIFI Shariah Standard No. 35 on Zakat).
- **In-App Explanations & Translations**: The explanation banners, exclusion notes, and locale keys across all 11 languages are fully approved, canonized, and signed off by leadership as accurate and definitive.
- **Official Closure**: **This item is officially RESOLVED and LOCKED.** No further external review or alterations are required. You may permanently remove this item from your "Next Step Proposals" list in future reports.

---

### Authorized Directive 14: L-1 God Component Decomposition — `AddCardModal.tsx` (631 lines)

We authorize you to proceed with deconstructing the remaining monolithic component targets:

#### Option A (Recommended — L-1 Decomposition): `src/features/cards/components/AddCardModal.tsx` (631 lines)
- **Objective**: Bring `AddCardModal.tsx` to **under 300 lines**.
- **Suggested Modular Breakdown**:
  - `CardVisualPreview.tsx`: Card flip visual preview, dynamic gradient/theme rendering, chip & network logo overlays.
  - `CardStylePicker.tsx`: Theme selection, color palette, card network / tier pickers.
  - `CardFormFields.tsx` or sub-modal logic: Card inputs, expiry formatting, validation, and spending limit toggles.
- **Testing**:
  - Write characterization test suite covering card creation, edits, style changes, and validations.
  - Execute prop wiring mutation testing (100% mutant kill rate).

#### Option B (Alternative L-1 Target): `src/features/reports/components/AdvancedAnalytics.tsx` (622 lines) OR `src/features/transactions/components/TransactionList.tsx` (622 lines)
- Target: Bring under 350 lines with clean subcomponents and comprehensive test suites.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All 844 existing + new tests passing (100%).
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
