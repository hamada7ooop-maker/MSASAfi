# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 10 — `Settings.tsx` modularized (complete)

**669 → 263 lines (-61%)**, comfortably under the 320 target.

| file | lines | contents |
|---|---|---|
| `Settings.tsx` | **263** | tabs, search filter, mockup modal, version tap counter |
| `settingsSections.tsx` | 265 | the twelve-section search index |
| `DevUnlockModal.tsx` | 169 | developer master-unlock sheet |
| `SettingsPrimitives.tsx` | 95 | `SettingsCard` + `SectionGroup` |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 799/799 across 96 suites.**

#### The security-sensitive part, handled carefully

The extracted `DevUnlockModal` carries the **M-3 backdoor**. I did not treat it as ordinary markup:

- The gate is now **layered**: the page mounts the component only inside an `import.meta.env.DEV` branch, the component returns `null` unless `import.meta.env.DEV`, and the handler returns early on the same condition. Any one would suffice; requiring all three means a future edit has to defeat three independent checks.
- **Verified against a real production build**, not just by reading code: `npm run build` then `grep` for `VITE_MASTER_HASH` / `DEV_UNLOCK` across `dist/assets/` returns nothing. The backdoor is absent from the shipped bundle, exactly as before the split.
- `tests/unit/backdoorRemoval.test.ts` was scanning only `Settings.tsx` and broke when the code moved. Rather than delete or weaken the assertions I **repointed it at both files**, and made the "walk back to the enclosing guard" scan run **per file** so it cannot accept a guard from the wrong one. Then I proved it still bites: removing the component-level guard fails the suite.

That last point matters more than the line count. A source-scanning security test that silently stops covering relocated code is worse than no test, because it keeps reporting green.

#### Step 1 — harness validated 6/6

Nine characterization tests driving the search box. One survivor on the first pass: dropping keyword matching entirely, because every query I had chosen (`backup`, `gemini`, `لغة`) *also* matches a translated label. Fixed with **`فيزا`** — a keyword on the cards section that appears in no translation — which is the only kind of query that isolates that half of the filter.

#### Step 3 — prop wiring: 0/9 → 9/11, with 1 equivalent and 1 corrected mutant

The first run scored **0/9** and I checked it before believing it, having been caught by a mis-scored run in Directive 9. This time the measurement was right and the tests were wrong: **every assertion was a `not.toContain`**, which an empty page satisfies. A settings screen rendering nothing at all passed nine tests.

Every negative assertion is now paired with a positive one. That closed seven mutants.

Two notes on the remainder:

- **W6 was a faulty mutant of mine, not a gap.** I wrote `[] && buildSettingsSections(...)` to simulate an empty index — but `[]` is truthy in JavaScript, so it evaluated to the real array and changed nothing. Rewritten correctly, it is killed by 14 tests.
- **`onUnlocked` is genuinely unreachable in tests.** It fires only after a correct PBKDF2 match against `VITE_MASTER_HASH`, a secret deliberately absent from the repo and CI (confirmed: no value in any committed env file). No test can reach it without shipping the secret, which would defeat the control it guards. Recorded in a source comment rather than covered with a fake.

### Next Step Proposals

1. **Scholar review of the zakat exclusion wording** — unchanged, still the only outstanding correctness risk, now carried across four directives.
2. The a11y pass I flagged in Directive 9 is still open; a `grep` for icon-only buttons across `src/features/` would size it in minutes.
3. L-1 continues: `cardConstants.ts` (775), `gemini.ts` (679).
