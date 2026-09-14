# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.12 Approved & Directive 13 Authorized

Outstanding work on Directive 12! The modularization of `gemini.ts` into `src/core/ai/` was executed with pristine engineering craftsmanship:
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.12** (`1818e224d718f4556f4df9a9fc894202198fd5b2`)
  - **APK**: `Masarifi_V23.1.12_Signed_Release.apk` (16,634,571 bytes / 15.86 MB) — SHA256: `E5FC674F790C3BC64C24AE13BA63785805E0758467CEDEA1E9F4B2B2D80F6A5B`
  - **Clean Source ZIP**: `Masarifi_V23.1.12_Source_Clean.zip` (9,189,091 bytes / 8.76 MB) — SHA256: `520340007ED887D9C6A19CD097D507D0A66629717D7AF0764A34B39DAC5E8497`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **828 / 828 passing (100%)** across 98 test suites.

- **Architectural Findings & Approvals**:
  - **Risk-Centric Decomposition**: Strongly commend the boundary design choosing risk separation over superficial line counts:
    - `providerKeys.ts`: Storing API keys in `secureStore` rather than Dexie prevents accidental data leaks during local database backups.
    - `contextBuilder.ts`: Single audit point for what personal financial data leaves the device.
    - `rateLimiter.ts`: Prompt-injection defense and isolated timing prevent circumventing limits.
    - `gemini.ts`: Complete preservation of re-exports yielding an **empty diff** in `src/features/chatbot/` with zero breaking changes.
  - **Characterization & Mutation Rigor**: 23 characterization tests and 10/10 mutants killed across all new module boundaries.
  - **Fixture Hygiene**: The documentation of `secureStore` vs Dexie `wipe()` and `onLine` stub containment provides valuable architectural insights for future suites.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.27) have been updated with the v23.1.12 release verification data.

---

### Authorized Directive 13: Non-Button Clickable A11y Sweep OR AddCardModal Decomposition

You are authorized to proceed with either of the following targets:

#### Option 1 (Recommended by Auditor / High-Impact A11y & Keyboard Navigation): Clickable `<div>` / `<span>` Elements
- **Problem**: Non-button elements with `onClick` lack accessible roles, keyboard focus (`tabIndex={0}`), and keyboard activation handlers (Enter / Space key listener). This renders them completely unreachable and unusable for keyboard and assistive tech users.
- **Scope**:
  - Scan for clickable `<div>` and `<span>` elements with `onClick`.
  - Add `role="button"`, `tabIndex={0}`, accessible `aria-label`, and keyboard trigger handlers (`onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}`), or refactor to semantic `<button>` where styling permits.
  - Create or extend an a11y test guard (e.g. in `tests/unit/clickableElementsA11y.test.ts` or expanding `tests/unit/iconButtonA11y.test.ts`) with a strict zero-allowlist policy.

#### Option 2 (L-1 God Component Decomposition): `src/features/cards/components/AddCardModal.tsx` (631 lines)
- **Scope**:
  - Deconstruct `AddCardModal.tsx` into modular subcomponents under `src/features/cards/components/` (e.g. CardVisualPreview, CardStylePicker, CardFormInputs).
  - Target: reduce file size to well **under 300 lines**.
  - Write characterization tests and verify 100% mutant kill rate on prop wiring.

#### Option 3 (L-1 God Component Decomposition): `src/features/reports/components/AdvancedAnalytics.tsx` (622 lines) OR `src/features/transactions/components/TransactionList.tsx` (622 lines)
- Target: reduce to under 350 lines with modular subcomponents and full test coverage.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing (100%).
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
