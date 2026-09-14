# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 8 — `Bills.tsx` modularized (complete)

**I chose Bills over demoData**, and the reasoning is worth recording: `Bills.tsx` already contained **two complete, self-contained components** defined inline (`BillModal` at 179 lines, `SubModal` at 152), so extracting them is a pure relocation with a real seam. `demoData.ts` is 193 static object literals with a single exported service — splitting it would move data between files without reducing any component's complexity or making anything easier to reason about. Line count would improve; nothing else would.

**699 → 367 lines (-47%)**, well under the 450 target.

| file | lines | contents |
|---|---|---|
| `Bills.tsx` | **367** | summary strip, tabs, bill/sub lists, bulk selection |
| `BillModal.tsx` | 195 | add/edit sheet for a bill |
| `SubModal.tsx` | 167 | add/edit sheet for a subscription |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 761/761 across 93 suites.**

#### Step 1 — harness validated 6/6

Nine characterization tests, then six mutants against the untouched original: **5/6 first pass**. The survivor was instructive — swapping the overdue and upcoming counters passed, because I had asserted only that "2" and "1" appeared *somewhere* in the summary strip. Swapping them leaves both digits present.

Fixed with a `counterFor(label)` helper, which needed scoping twice: the word **مستحقة!** also appears on every overdue bill *card*, so an unscoped search returned a card and read its amount as if it were a count. Both counters are now read from their own tile inside the summary header. **6/6 after that.**

#### Step 3 — prop wiring: first pass **2/8**, final **10/10**

The worst result of any directive so far, and correctly so: my characterization tests covered the *list* thoroughly and the *edit lifecycle* not at all. Six survivors — a dropped `bill` prop, a modal that never closes, an unwired delete, a subscription modal receiving nothing, a modal rendered unconditionally, and an edit button that never stashed its bill.

Five new tests cover the full lifecycle: prefill, update-in-place (asserting the bill count does **not** grow), close-after-save, delete-with-confirmation, and add-after-edit. That last one matters for the same reason it did in `TravelBudget`: testing "add" on a fresh page cannot see stale edit state.

**One equivalent mutant, proven by reading the source rather than assumed.** Routing an edit through `addBill` instead of `updateBill` changes nothing: `schema.ts` implements `addBill` as `put({ ...data, id: data.id || generated })`, and the modal spreads `...bill`, which carries the id. Both paths upsert the same row. No test can distinguish them, so the test says so in a comment instead of pretending to cover it.

Two of my own test failures along the way were my errors, not source defects: the close-after-save test omitted an amount, and `handleSave` returns early on a zero amount — so it was exercising validation, not closing. And three buttons on this screen are **icon-only material ligatures** (`add`, `edit`, `delete`) with no title attribute, which is worth knowing for future tests on this file.

### Next Step Proposals

1. **Scholar review of the zakat exclusion wording** — still the only outstanding risk item, now carried across two directives.
2. L-1 continues: `cardConstants.ts` (775), `Challenges.tsx` (692), `gemini.ts` (679), `Settings.tsx` (669).
3. **A11y observation, low priority:** the icon-only buttons noted above have no `title` or `aria-label`, so a screen-reader user hears "add", "edit", "delete" read as raw ligature text. The a11y work in `636a995` covered live regions and contrast but not this. Worth a small pass if you want it.
