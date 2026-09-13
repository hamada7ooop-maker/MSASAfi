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

### Directive 1 — post-restore prompt at launch (complete)

`PostRestorePinGate` (`src/features/auth/components/PostRestorePinGate.tsx`), mounted in `AppShell` above `PinScreen`. Checks `isPinSetupPending()` at mount and blocks until answered.

Three decisions worth recording:

1. **It sits above the lock screen, not behind it.** A restored vault has no PIN, so `PinScreen` has nothing to unlock — but the restored data is plaintext until this is answered. Ordering them the other way would show a lock over data that is not locked.
2. **It is not dismissable, and `resetVault` is deliberately NOT offered here.** "Remind me later" would mean "leave my financial history readable", so there is no honest deferral. Equally there is nothing to escape from: the data is readable, the user is not locked out, so the only sensible action is to protect it. The destructive path belongs on the lockout screen, where it is the only way out — not here.
3. **The PIN is confirmed twice, and encryption runs before the PIN is persisted.** A typo is unrecoverable, since the PIN is the sole key material. And if encryption fails the user keeps no PIN and is re-prompted next launch, rather than ending up with a lock over data that was never encrypted.

**Tests:** `tests/unit/postRestorePinGate.test.tsx`, 6 tests, asserting the **database** for the `_encrypted` envelope rather than the component's own success message — the bug class here is precisely data that looks protected and is not.

**Mutation tested (5 mutants): 4/5 killed first pass.** The survivor mattered: leaving the gate open after a successful setup passed everything, because I had asserted the flag was cleared but never that the modal actually closed — the user would have been stuck behind a blocking dialog whose work was already done. Added that assertion; **5/5 killed** on recheck.

4 new locale keys (`security.pinMismatch`, `security.confirmPin`, `security.enterNewPin`, `security.encryptNow`) across all 11 files; ar + en translated, the other 9 seeded from English. `i18n-sync` 100%.

**Gate: tsc 0 · eslint 0 · build 0 · 666/666 across 86 files · i18n 100%.**

### Next Step Proposals

Directives 1 and 2 are both complete. **Next up is directive 3, L-1 on `FamilyExpenses.tsx`**, following the 3-step discipline (characterization tests in `tests/unit/familyExpenses.test.tsx` → extract `SharedWalletTab.tsx` / `ChildrenAccountsTab.tsx` etc. into `src/features/family/components/` → mutation-test the new prop wiring).

Two notes before that starts:

- **Release counts.** `ceeb76f` cites 653/653, which was correct at `ac97159`. The suite is now **666/666** across 86 files: +5 mutation-gap tests (`55f98c1`), +2 encryption regressions (`d409a9b`), +6 gate tests (this commit). Worth rebuilding v23.0.18 from the current head, since it also carries the read-path fix described above — that one affects every encrypted read in the app, so the signed APK you have is missing it.
- **Residual, low priority:** the ~63 detached `recordAction(...).catch(silentFail)` calls are safe today only because they fire after their transaction closes. Awaiting them, or routing them through one helper, would remove a footgun — but nothing is currently broken and I would not spend the next slot on it.
