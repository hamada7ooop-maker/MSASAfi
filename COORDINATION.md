# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 6 — Zakat engine canonical migration (complete)

The screen now delegates every calculation to `calculateZakat()`. **`git diff` on `src/core/zakatEngine.ts` is empty** — the engine was not touched — and `grep` confirms `0.025`, `85` and `595` no longer appear anywhere in `src/features/zakat/components/`. There is one implementation of the ruling now, not two.

**What changed for the user**

| scenario | before | after |
|---|---|---|
| 5,000 cash + 40,000 livestock + 20,000 crops + 100,000 property | **4,125 due** | **nothing due** (monetary wealth is below nisab) |
| 100,000 cash + 160,000 exempt wealth | 6,625 | **2,500** |
| 100,000 cash with 40,000 of due debt | 2,500 | **1,500** |
| 50,000 cash with 20,000 of due debt | 1,250 | **nothing** — the debtor no longer holds a nisab |

**Exclusions are shown, not silently dropped.** Removing wealth from the base without telling the user would be its own failure. Each excluded bucket now renders with its actual ruling: livestock as fixed in-kind amounts, crops at 10% rain-fed / 5% irrigated against a nisab of five awsuq, and property held to live in or rent as carrying no zakat on the asset itself — only on rental income once that completes its own hawl.

**Hawl is represented honestly.** With no nisab date recorded the engine reports `status: 'unknown'`, and the screen labels the figure **تقديري (estimate)** rather than announcing a debt that has not yet fallen due. An optional date field drives a countdown while incomplete, and only once a lunar year has passed does the wording become "zakat is due now". Overstating *when* an obligation falls due is a smaller error than overstating its amount, but it is still an error.

**Liabilities** are a new input, persisted like the others, and the net base is displayed so the user can see exactly what the 2.5% was taken on.

**Tests: the `CURRENT BEHAVIOUR` characterization test is inverted** as directed, and five more were added around exclusions, combined portfolios and liabilities — including the case where debts drop a payer below nisab entirely.

**Mutation tested on the engine wiring: first pass 5/9, final 11/11.** The four survivors were all untested surface: the gold bucket, the net-base readout, and the entire hawl feature (a mutant that hard-wired `isDueNow` to true — quietly removing the estimate qualifier — passed everything). Every one is now covered.

### Directive 6B — cursor safety guard (complete)

`tests/unit/cursorSafetyGuard.test.ts`. I chose a source scan over an ESLint rule deliberately: the dangerous property is *which table* the call targets, and that is decided by `ENCRYPTED_FIELDS`. A lint rule would need its own hard-coded copy of that list and would drift the first time a table is encrypted. This guard **derives the table names from the real export**, so encrypting `chatHistory` tomorrow immediately starts protecting it.

Three tests: one asserting the export is non-trivial (so the scan cannot pass vacuously), one scanning `src/`, and one proving the pattern **actually fires** — including the multi-line form TravelBudget used, while not flagging the sanctioned `toArray()`-then-filter shape. Verified by reintroducing the original defect: the guard fails with the file, the call site, and the fix in the message.

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 746/746 across 92 suites.**

### A caveat I want on the record

I implemented the fiqh scope exactly as `zakatEngine.ts` documents it, and that documentation states the exclusions are agreed across the four Sunni schools. I can verify the code matches the stated rules and that the arithmetic is right; I am not in a position to certify the rulings themselves. Before this reaches users I would still want the wording of the three exclusion notices — and the 354-day hawl treatment — reviewed by someone qualified. The engineering is sound; the scholarship should be confirmed by a scholar.

### Next Step Proposals

1. **Scholar review of the exclusion wording**, per the caveat above. It is the only outstanding risk in this feature.
2. L-1 continues: `demoData.ts` (875), `cardConstants.ts` (775), `Bills.tsx` (699).
3. Optional: `nisabReachedDate` is currently one global date. If a user's wealth dips below nisab the hawl restarts, which the app cannot detect today. Worth considering if you want the hawl to be authoritative rather than advisory.
