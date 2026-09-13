# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 4 — `BankCardsManager.tsx` modularized (complete)

**1,085 → 546 lines (-50%)**, under the 600 target.

| file | lines | contents |
|---|---|---|
| `BankCardsManager.tsx` | **546** | header, card deck, detail panel, nav dots, delete |
| `AddCardModal.tsx` | 630 | the whole add/edit sheet incl. BIN auto-detection |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 695/695 across 88 suites.**

#### Step 1 — harness first, and it was weaker than it looked

`tests/unit/bankCardsManager.test.tsx`, written before touching the source, seeded with three cards carrying distinct last-4s, holders and banks.

Validating it against the untouched original was the important part: **the first version killed only 3 of 6 mutants.** Three blind spots, all the same mistake — asserting text against the *whole screen* when the deck already lists every card's name and digits:

- a detail panel pinned to `cards[0]` regardless of selection → **survived**
- the reveal toggle ignored, number permanently masked → **survived**
- the edit form opening the wrong card → **survived**

Fixed with a `detailPanel()` helper that scopes assertions to the panel (identified by the three labels only it carries), plus negative assertions that the panel does *not* show the previously active card. Re-validated: **6/6 killed.**

This is the second directive running where the first draft of the harness would have certified a broken extraction. I now treat "harness passes" as meaningless until the mutants say otherwise.

#### Step 2 — extraction

Same principle as `FamilyExpenses`: the win came from moving **state ownership**, not markup. The modal took its eight pieces of state (form fields, 3D flip, BIN detection status, last-queried BIN), its three input formatters, the BIN lookup helpers and `handleSave` — none of which anything else reads.

One behavioural improvement fell out of it. The parent used to prefill the form in `openEditModal` *and* reset it in `openAddModal`, two copies of the same knowledge that could drift. The modal now prefills itself from `editingCard` when it opens, keyed on `open` as well — so reopening for a new card after an edit resets the fields instead of inheriting the previous card's number, which would have silently saved someone else's PAN.

#### Step 3 — mutation testing on prop wiring

**First pass 3/6.** The three survivors were the callbacks: `onClose` as a no-op, `onSaved` not reloading the deck, `onSaved` not selecting a new card — all invisible because no test opened the sheet and completed an action. Added a cancel test, a full add-a-card test (asserting the row reaches the database *and* the deck reloads *and* the new card becomes active), and an edit test.

**Final 6/7 killed.** The survivor is equivalent and verified, not assumed: dropping the `if (wasNew)` guard cannot be observed because on an edit the modal reports `editingCard.id`, which is already the active card, so `setActiveCardId(sameId)` is a no-op by construction. The guard stays — it states the rule and keeps holding if the edit path ever changes a card's id — with a comment recording why no test covers it.

Also worth noting: `onSaved` not calling `loadCards()` initially survived because `loadCards` is a `useCallback` keyed on `activeCardId`, so selecting the new card re-fires the load effect anyway. The edit test kills it, since an edit does not change the selection and therefore has no such fallback.

### Next Step Proposals

Continuing down the >600-line list: **`ZakatCalculator.tsx` (964)**, then `AdvisorPage.tsx` (930), `TravelBudget.tsx` (923), `demoData.ts` (875).

`ZakatCalculator.tsx` deserves a flag before I start: it is the one file on this list where the logic is *religiously* consequential, and `src/core/zakatEngine.ts` already holds the tested fiqh rules from `65f5c89`. I would keep the split strictly presentational — no calculation moves — and characterize against the engine's outputs rather than re-deriving expected values in the test. Confirm if you would like it handled differently.

**Housekeeping:** the sandbox rewound before this task and lost `node_modules` plus the local branch pointer. Everything was already pushed, so I verified each file against `origin/arena/01a097d5-msasafi` (all identical), reset to `d800bf3`, and reinstalled. No work was lost.
