# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.10 Approved & Directive 11 Authorized

Exemplary execution on Directive 10! The 60% reduction of `Settings.tsx` and the multi-layered defense-in-depth handling of the M-3 developer unlock backdoor were executed with outstanding craftsmanship.
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.10** (`a3b1b01`)
  - **APK**: `Masarifi_V23.1.10_Signed_Release.apk` (16,630,375 bytes / 15.86 MB) — SHA256: `3E3EDEB64CD713AB42265D7DD4061423D00B41EEA8A3730FBABD25218069D67A`
  - **Clean Source ZIP**: `Masarifi_V23.1.10_Source_Clean.zip` (9,169,928 bytes / 8.75 MB) — SHA256: `CAA5E297749BC9E8F7E73454712B1073FA0BA453C54EBE31A31A63A38C036E00`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **799 / 799 passing (100%)** across 96 test suites.

- **Architectural Findings & Security Approvals**:
  - **Component Size Win**: `Settings.tsx` reduced from **670 to 270 lines (-60%)**, beating the 320-line target. Clean extraction of `settingsSections.tsx` (266), `DevUnlockModal.tsx` (170), and `SettingsPrimitives.tsx` (96).
  - **M-3 Security Guard Layering**: Fully approved the triple-barrier defense (`import.meta.env.DEV` mount guard + component null return + early handler return). Confirmed by bundle audit that `VITE_MASTER_HASH` and `DEV_UNLOCK` are completely tree-shaken and absent from the production release APK.
  - **Per-file Security Scanner**: Commended the architectural decision to update `tests/unit/backdoorRemoval.test.ts` to enforce per-file enclosing guards rather than allowing cross-file leakage.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.25) have been updated with v23.1.10 release data.

---

### Authorized Directive 11: Feature a11y Sweep OR Core Gemini / Cards Modularization

We authorize you to choose between the two following high-impact paths:

#### Option A (Recommended — Global A11y Sweep on Icon-Only Buttons):
As identified in Directive 9, icon-only buttons with material font ligatures (`edit`, `delete`, `add`, etc.) without accessible names announce raw ligature strings to screen readers.
- Perform a focused sweep across remaining features: `src/features/transactions/`, `src/features/budgets/`, `src/features/goals/`, `src/features/debts/`, `src/features/accounts/`.
- Add explicit `aria-label` (localized or standard action key) and wrap icon spans with `aria-hidden="true"`.
- Expand or add an a11y test harness (similar to `billsA11y.test.tsx`) to prevent future regressions.

#### Option B (Core AI Modularization — `src/core/gemini.ts` 680 lines):
- Deconstruct `gemini.ts` into modular sub-modules under `src/core/ai/`:
  - `providers/` (Gemini, Groq, custom OpenAI-compatible client).
  - `contextBuilder.ts` (financial context extraction from repositories).
  - `rateLimiter.ts` / fallback management.
- Target: bring `gemini.ts` under 250 lines.

#### Option C: `src/features/cards/data/cardConstants.ts` (776 lines) or `AddCardModal.tsx` (631 lines):
- Clean up the duplicate `LOCAL_TEXTS` in `cardConstants.ts` or modularize `AddCardModal.tsx`.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
