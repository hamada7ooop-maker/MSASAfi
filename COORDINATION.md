# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `

---

### ⚠️ Critical Hotfix Applied to `src/core/db/encryption.ts` (safeWaitFor)

**Issue Observed in Preview**:
In real browser environments, single-operation queries (`useLiveQuery`, `table.toArray()`, `table.get()`) auto-commit their native IndexedDB transaction as soon as the read resolves.
Calling unconditional `Dexie.waitFor` *after* `downTable.get(req)` or `downTable.query(req)` completed caused Dexie to attempt `root.idbtrans.objectStore(root.storeNames[0])` on a closed/finished transaction, throwing:
`Failed to execute 'objectStore' on 'IDBTransaction': The transaction has finished. InvalidStateError` across every screen on mount.

This passed in Vitest because `fake-indexeddb` does not simulate native Blink/Chromium microtask transaction commit timing.

**Resolution**:
Implemented `safeWaitFor`:
```typescript
function safeWaitFor<T>(promise: Promise<T>): Promise<T> {
  const tx = Dexie.currentTransaction;
  if (tx && tx.explicit && tx.active) {
    try {
      return Dexie.waitFor(promise);
    } catch {
      return promise;
    }
  }
  return promise;
}
```
- For explicit multi-operation transactions (e.g. `db.transaction('rw', ...)`), `Dexie.waitFor` is engaged, keeping the transaction alive for subsequent operations (preserving the multi-read test from `encryption.test.ts`).
- For standalone single reads (`useLiveQuery`, etc.), it skips `Dexie.waitFor`, allowing the already-resolved read data to decrypt cleanly in memory without touching the finished IDB transaction.
- All 666 tests pass, 0 tsc errors, 0 lint warnings. Your browser preview is now clean and working!

## 📝 Auditor Report & Next Step Proposals

### Directive 3 — `FamilyExpenses.tsx` modularized (complete)

**1,095 → 420 lines (-62%)**, comfortably under the 600 target.

| file | lines | contents |
|---|---|---|
| `FamilyExpenses.tsx` | **420** | tab switch, member/child modals, shared state |
| `SharedWalletTab.tsx` | 599 | members banner, expense form + split calculator, transaction log |
| `ChildrenAccountsTab.tsx` | 274 | overview totals, child cards, add-child form |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 682/682 across 87 suites.**

#### Step 1 — characterization harness first

`tests/unit/familyExpenses.test.tsx`, written before touching the source. Seeded with deliberately distinct non-round values (1,250 / 430 / 300 / 120 / 75 / 50) so no assertion can pass by coincidentally matching a zero, a default, or another figure on the same screen.

I verified the harness could actually *fail* before trusting it: five mutations against the untouched original (broken totals, swapped balance/allowance, dropped member count, disabled tab switch) — **5/5 killed**. A harness that has never failed is not evidence.

#### Step 2 — decomposition

The large win was not moving JSX but moving **state ownership**. The add-child form, the per-card transaction drawer, the expense form, the chips and the split calculator were all held in the parent while being read by exactly one tab each — that is what had grown it to 30+ `useState` calls. They now live in the component that uses them, and the props carry only what genuinely crosses the boundary: data, store mutators, and the modals the parent owns.

Two judgement calls worth flagging:

- **Selection state is read from the app store inside `SharedWalletTab`, not passed down.** It is genuinely global (the bulk-selection bar is shared with other screens), so threading it through props would fake a local ownership that does not exist.
- **Renaming a member no longer reaches into the tab's state.** The parent used to call `setSelectedChips` directly to refresh a cached chip label. Post-extraction that would have required exposing the tab's internals, so the tab now derives the fix from its `members` prop with a small sync effect — the rename flows down as data, which is the only direction that survives extraction.

#### Step 3 — mutation testing on prop wiring (the step that earned its place)

**First pass: 4/10.** Six survivors, every one a real gap in *my* tests:

| mutant | first pass | why it survived |
|---|---|---|
| balance/allowance props **swapped** | ❌ | I asserted both numbers appeared *somewhere*; swapping leaves both present |
| `onAddMember` → no-op | ❌ | asserted "some empty input exists" — always true |
| `onEditChild` → no-op | ❌ | no test clicked it |
| `onEditMember` → no-op | ❌ | no test clicked it |
| `deleteMember` → no-op | ❌ | no test clicked it |
| payout forwards wrong account id | ❌ | see below |

The swapped-props survivor is the most instructive: it is the single most likely slip in a refactor of this shape, and my "both numbers are on the page" assertion was blind to it by construction. Fixed with a `cardTextFor(label)` helper that reads each value **inside its own labelled card** and asserts it does *not* contain the other total.

**Final: 10/11 killed** (I added an eleventh, `accounts` dropped from the children tab — killed).

**The remaining survivor is an equivalent mutant, and I verified that rather than asserting it.** Forwarding `''` instead of the real account id renders a byte-identical DOM: a `<select>` bound to `''` displays its first option anyway, and the parent submits `allowanceAccountId || accounts[0]?.id`, which re-derives the same id. I rendered both variants and diffed — `selects=1 value=acc-first` in each. No test can distinguish them, so none pretends to; the comment in the test records why.

En route I also had to fix a test of my own that was passing for the wrong reason: it clicked the payout button before `useFamily` had loaded accounts, so it was exercising the "pay immediately" branch rather than the modal path.

### On your `safeWaitFor` hotfix — confirmed correct, and my mistake

You were right, and the bug was mine. My read-path change called `Dexie.waitFor` unconditionally, including inside *implicit* single-request transactions that the browser has already committed by the time the decrypt runs. `fake-indexeddb` does not model Blink's commit timing, so my looped regression test could not see it — a case of the test environment being more forgiving than production, which is exactly the trap I had warned about in the opposite direction two commits earlier.

I verified your fix rather than assuming it: with `safeWaitFor`'s guard neutered, my read-path regression test fails **3 runs out of 3**, and passes with it intact. So the guard still engages `Dexie.waitFor` precisely where the race is real (explicit multi-request transactions) and skips it where there is nothing left to keep alive. The protection is preserved, not weakened.

Worth recording for the memory: **`fake-indexeddb` and native IndexedDB disagree on transaction lifetime in both directions.** It is stricter than Blink about foreign awaits inside explicit transactions (which is how the original defect surfaced), and laxer about calling `waitFor` on a finished implicit one. Neither environment alone is sufficient evidence for changes to this middleware; the preview caught what 682 tests could not.

### Next Step Proposals

L-1 continues down the >600-line list. Next by size: **`BankCardsManager.tsx` (1,085)**, then `ZakatCalculator.tsx` (964), `AdvisorPage.tsx` (930), `TravelBudget.tsx` (923).

One note on scope: `SharedWalletTab.tsx` is 599 lines — under the bar, but only just. Its expense form and split calculator are separable if you want it smaller. I stopped here because further splitting would have been driven by the line count rather than by a real seam, and the current boundary matches how the screen is actually used. Say the word if you would prefer it broken down further.
