# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.

---

## Current Directives: Release v23.1.11 Approved & Directive 12 Authorized

Magnificent execution on Directive 11! Resolving ~135 unlabelled icon buttons across 109 files and installing the dual static + rendered a11y harness is a monumental leap for accessibility and user dignity.
- **Release Verification Data (Built, Tested & Signed Locally)**:
  - **Release Tag**: **v23.1.11** (`72de7dc`)
  - **APK**: `Masarifi_V23.1.11_Signed_Release.apk` (16,635,615 bytes / 15.86 MB) — SHA256: `9615B3DA89A2691FBFFAFE55A361E6904C441C5AF15BEB216431D5AD4B1E5443`
  - **Clean Source ZIP**: `Masarifi_V23.1.11_Source_Clean.zip` (9,180,911 bytes / 8.76 MB) — SHA256: `84E15E00ACE64AE1A7AA358819C3945972CCBABC96ED50C6F0DEC45359DDDE5A`
  - **Quality Gates**: `tsc --noEmit` 0 errors · `npm run lint` 0 warnings · `guardian.mjs validate` 189 tips clean across 11 locales.
  - **Tests**: **804 / 804 passing (100%)** across 97 test suites.

- **Architectural Findings & Approvals**:
  - **Zero Allowlist Invariant**: Strongly endorse keeping the allowlist completely empty in `tests/unit/iconButtonA11y.test.ts`. A rule with an expanding allowlist is indeed an abandoned rule.
  - **Rendered Cross-Check Rigor**: Acknowledged the insight that static tag regexes alone can fail on embedded JSX arrows (`onClick={() => setX(1)}`), and that the rendered test caught what static analysis missed.
  - **11-Locale Sync**: All 16 newly added action keys verified clean under guardian validation.
  - **Permanent Memory Updated**: `GEMINI.md` and `AUDIT_REPORT.md` (Section 12.26) have been updated with v23.1.11 release data.

---

### Authorized Directive 12: Core AI Deconstruction OR AddCardModal / Non-Button A11y

We authorize you to proceed with either of the following targets:

#### Option A (Recommended — AI Core Deconstruction): `src/core/gemini.ts` (680 lines)
`gemini.ts` is our largest monolithic service handling AI interaction. Deconstruct it into `src/core/ai/`:
1. `providers/`:
   - Gemini 1.5 Flash client.
   - Groq (llama-3.1-8b-instant) fallback client.
   - Custom OpenAI-compatible endpoint handler.
2. `contextBuilder.ts`: Repository queries, user score, budget, and transaction context aggregation.
3. `rateLimiter.ts` & fallback dispatcher: State management for active providers and retries.
- **Target**: Bring `gemini.ts` (or `index.ts`) under 250 lines while preserving all existing function signatures and exports.

#### Option B: Component Modularization — `src/features/cards/components/AddCardModal.tsx` (631 lines)
- Extract card flip preview, scanner/camera integration, and style picker into clean subcomponents.
- Target: bring `AddCardModal.tsx` under 300 lines.

#### Option C: Non-Button Clickable A11y (div / span with onClick)
- Sweep clickable non-button elements to ensure `role="button"`, `tabIndex={0}`, and keyboard event handlers are present.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All existing + new tests passing.
- Translations: Validate any newly introduced keys with `node scripts/guardian.mjs validate`.
- Update `## 📝 Auditor Report & Next Step Proposals` before committing and pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
