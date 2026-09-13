# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

*(Earlier report on the two security items was read and actioned in `ceeb76f` — not repeated here. What follows is new.)*

### Sweep for other async-in-transaction sites (proposal 2, executed)

I ran this before resuming L-1 because the `Dexie.waitFor` defect looked like a *class* of bug. It was. **The sweep found a second live instance and, more importantly, established how severe the first one was.**

**Scope.** Nine `.transaction(` call sites across 4 files, every `await` inside each body, plus all five Dexie middleware hooks. Everything except the middleware turned out to be clean: all in-transaction awaits are IndexedDB calls (`applyBalanceDelta` is just `get` + `put`), and the ~63 detached `recordAction(...).catch(silentFail)` calls fire *after* their transaction closes, so they are untidy but not the hazard — measured at 30/30 audit rows landing with zero transaction failures.

**Finding A — the write-path defect was far worse in production than I reported.** I had measured it on synthetic writes. Measured on the real repository path with the fix removed:

| path | failures |
|---|---|
| `TransactionRepository.add` (the app's commonest action) | **24 / 25** |
| detached audit write then a transaction | 10 / 30, 7 / 30 |

So for any user with a PIN set, **adding an expense failed almost every time**. That reframes the earlier fix from "a race worth fixing" to "the encrypted build was effectively unusable". It went unnoticed because no test had ever written to an encrypted table through a repository with a key loaded.

**Finding B — the read path had the identical defect, unfixed.** `get`, `getMany`, `query` and `openCursor` all decrypt *after* reading, which is equally a foreign WebCrypto promise awaited inside the transaction. Only `mutate` had been wrapped. Reproduced at **0–2 failures per 20 transactions (~5%)**, consistently across six runs.

The low rate makes it *more* dangerous than the write bug, not less: a read that fails 5% of the time surfaces as a screen that occasionally shows nothing, which looks like a UI glitch and gets dismissed — where a failing write throws loudly. Two of the three probes also intermittently failed to complete at all before the fix, and complete reliably after it.

**Fixed** by wrapping all five decryption sites in `Dexie.waitFor`, taking the probes to **18/18 clean across six runs**. Verified honestly: with only the read-path wrappers reverted the new test fails **4 runs out of 4**; restored, it passes 3/3.

Both findings are now permanent tests in `encryption.test.ts` (8 tests), each looped — at a 5% failure rate a single-pass test proves nothing. The source carries an explicit rule: *never `await` a non-IndexedDB promise in this file without `Dexie.waitFor`.*

**Gate: tsc 0 · eslint 0 · build 0 · 660/660 (run twice).**

### Next Step Proposals

Your directives in `ceeb76f` arrived while this sweep was running, so the ordering already matches:

- **Directive 2 (harden async-in-transaction sites) — complete, above.** Note it found more than expected: the read path was a second live instance, and the original write defect measured 24/25 failures on the commonest user action.
- **Directive 1 (post-restore prompt at launch) — next.** I will gate it in `AppRoot` on `isPinSetupPending()`. Note that `ac97159` already shipped the `SecurityCard` warning banner, so this is the launch-time enforcement layer on top of it, not a duplicate.
- **Directive 3 (L-1 `FamilyExpenses.tsx`) — after that**, using the 3-step discipline: characterization tests → extraction → mutation testing on the new prop wiring.

One correction for the record: the release note in `ceeb76f` cites **653/653**, which was the count at `ac97159`. The suite is now **660/660** — `55f98c1` added 5 mutation-gap tests and this commit adds 2 regression tests.
