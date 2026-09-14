# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `
### 📌 Backlog Note (Future Enhancement): Secure CVV Storage & Reveal Mechanism
- **Feature Proposal**:
  - Add optional 'Reveal CVV 👁️' capability in Bank Cards.
  - **Security Requirements**:
    1. Include `cvv` in `ENCRYPTED_FIELDS` in `src/core/db/encryption.ts` so it is strictly AES-GCM encrypted in IndexedDB.
    2. Protect the reveal action behind biometric authentication (`BiometricService`) or Vault PIN fallback.
    3. Keep CVV masked by default (`•••`) to maintain PCI-DSS compliance and prevent shoulder-surfing.
  - *Status*: Scheduled for post-modularization phase.

---

## 📝 Auditor Report & Next Step Proposals

### 🔴 Data-integrity defect found and fixed: cursor reads returned wrong rows

This is the important item in this report. It was **not** part of the task — the travel-budget characterization tests reported a total of 3,600 where the seeded data summed to 3,000, and following that discrepancy led here.

**The encryption middleware's `openCursor` proxy corrupted every cursor read.** It cached a decrypted copy of `cursor.value` and refreshed it inside an **`async` override of `continue()`**. Both halves broke the cursor protocol:

- `continue()` is **synchronous and fire-and-forget**. Replacing it with an async function returned a promise where the contract says `void`, and refreshed the cached value a microtask *after* the advance had already been signalled.
- `value` is a **live property of the cursor's current position**. Caching it meant the iterator kept re-reading a stale row.

Measured on four rows through `Table.filter()`:

| | result | sum |
|---|---|---|
| expected | `t1, t2, t3, t4` | **15** |
| actual | `t1, t1, t2, t3` | **8** |

A duplicated row, a dropped row, and a silently wrong total. A narrower proxy variant returned `t1, t1, t1, t1`.

**This is not a regression from my `safeWaitFor` work.** I checked out `src/core/db/encryption.ts` at the base commit `63ff1b4` and ran the same probe: identical wrong output. It has been present the entire time.

**Fix:** stop proxying the cursor. Decryption cannot happen in a synchronous getter (WebCrypto is async) and there is no correct way to await inside the cursor protocol, so cursor reads now return enveloped rows and decryption stays with `get` / `getMany` / `query`, which cover every read path the app actually uses. Regression test added to `encryption.test.ts` using powers of two, so any duplicate or omission changes the sum uniquely. Verified: fails with the old proxy, passes with the fix.

**Second-order fix:** three call sites used `Table.filter()`, and two of them (`TravelBudget`) filter transactions whose `amount` **is** encrypted — so under the new behaviour they would read `undefined` amounts and show every trip at zero spending. All three now use `toArray()` then filter in JS, each with a comment explaining why. `recurringService` is not on an encrypted table today but was changed too, since it would break silently the day it becomes one.

### L-1 continued — `TravelBudget.tsx` (complete)

**923 → 580 lines (-37%)**, under 600.

| file | lines | contents |
|---|---|---|
| `TravelBudget.tsx` | **580** | trip grid, conversion, forecast hub, delete/archive |
| `TripFormModal.tsx` | 310 | the eight-field add/edit sheet |
| `data/travelFallbacks.ts` | 111 | offline destination facts (static data) |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 734/734 across 91 suites.**

**Step 1 — harness validated 5/5**, after adding an assertion for the consumption percentage: hard-zeroing it renders a plausible-looking progress bar and passed everything else.

**Step 3 — prop wiring 7/7**, over three rounds. The instructive survivor was `handleAddNew` forgetting to clear `tripToEdit`: my "opens a blank form" test ran on a fresh page, where no stale trip can exist. Only **edit-then-add** — the sequence a user actually performs — exposes it, and that is the case where the bug would save changes onto the wrong trip.

### Next Step Proposals

1. **The zakat engine migration.** Still unanswered, still my first recommendation, and now joined by a second correctness finding that came from exactly this kind of digging.
2. **Worth considering:** an audit of remaining `Table.filter()` / `Table.each()` usage as a lint rule. Today only three sites existed, but the failure mode is silent wrong numbers rather than an error, and nothing stops the next one being added.
3. Otherwise L-1 continues: `demoData.ts` (875), `cardConstants.ts` (775), `Bills.tsx` (699).
