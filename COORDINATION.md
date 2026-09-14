# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 9 — both items complete

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 783/783 across 95 suites.**

#### 9.1 — Bills a11y

Nine icon-only buttons across `Bills` / `BillModal` / `SubModal` exposed no accessible name. Because a material ligature is real text in the DOM, a screen reader announced **"edit"**, **"check_circle"**, **"hourglass_empty"** — fragments of an icon font rather than actions.

I wrote `tests/unit/billsA11y.test.tsx` **before** the fix, and it failed 4/4 with a list of every offender. Then: `aria-label` on all nine (reusing existing `action.*` keys where they existed, plus three new ones), `aria-pressed` on the work-hours toggle, and `aria-hidden="true"` on all 16 decorative icon spans — without the last part the ligature is concatenated onto the label and the user hears *"edit bill edit"*.

The suite approximates the accessible-name computation the way a screen reader does (aria-label → title → visible text with hidden nodes stripped), so it will catch the next icon-only button added to these files.

#### 9.2 — `Challenges.tsx` modularized

**692 → 380 lines (-45%)**, exactly at the 380 target.

| file | lines | contents |
|---|---|---|
| `Challenges.tsx` | **380** | tabs, shared state, week/no-spend handlers, confirm modals |
| `ChallengeModal.tsx` | 141 | add/edit sheet |
| `CustomChallengesTab.tsx` | 137 | challenge list, selection, two-step delete |
| `Week52Tab.tsx` | 96 | the 52-week grid |
| `NoSpendTab.tsx` | 76 | no-spend day panel |

Selection state deliberately stayed with the parent: the header's bulk-action bar reads the same `selectedIds`, so pushing it into the tab would create two lists that can disagree about what is selected.

**Step 1 — harness validated 6/6 first pass.**

**Step 3 — prop wiring: 2/13 → 13/13.**

#### A measurement bug in my own tooling, which I want on the record

The first run reported **1/13**, and I nearly accepted it. It looked wrong — removing a whole tab should break the tab tests — so I re-ran one mutant by hand: it killed **9 of 9**.

The fault was my mutation driver. Vitest prints `N failed | M passed (T)` normally but only `N failed (T)` when *everything* fails, and my regex required the `passed` group. **A total wipeout was being scored as zero failures — a survivor.** So the most catastrophic mutants were the ones most likely to be misreported as safe.

Fixed the parser to match `failed` independently and to return a sentinel when the suite does not run at all. The corrected baseline was 2/13, and the eleven real survivors were then genuine gaps:

- my tab tests asserted only that the *previous* tab's content had gone, which an empty tab satisfies — so "never render this tab" survived. Now each tab is asserted present by its own heading.
- the 52-week banked total `60` is a substring of the `13,780` goal printed beside it, so a page-wide check could not see an emptied `completedWeeks`. Now scoped to the totals row and matched as a leading figure.
- `onVerify`, `onToggleSelection` and the shared selection set had no test at all.

Worth generalising: **a mutation score that looks implausibly bad deserves the same scrutiny as one that looks implausibly good.** I would not have found this if I had simply reported 1/13 and started writing tests.

### Next Step Proposals

1. **Scholar review of the zakat exclusion wording** — unchanged, still the only outstanding correctness risk, now carried across three directives.
2. The a11y pattern from 9.1 almost certainly repeats elsewhere; `grep` for icon-only buttons across `src/features/` would size it quickly. I would treat it as one focused pass rather than folding it into future refactors.
3. L-1 continues: `cardConstants.ts` (775), `gemini.ts` (679), `Settings.tsx` (669).
