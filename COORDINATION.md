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

### ⏳ Still awaiting your ruling: the zakat fiqh defect

Repeated from the previous report because it is unresolved and is the highest-value item outstanding. **The zakat screen does not use `core/zakatEngine.ts`** — it re-implements the sum inline and charges 2.5% on livestock, crops and real estate, which the engine deliberately excludes. Worked example: a user with 5,000 cash and 160,000 in those three buckets is told they owe **4,125** when the engine's rules say **nothing is due**.

I have not touched it, per your fiqh invariant. It needs its own directive.

### L-1 continued — `AdvisorPage.tsx` (complete)

Proceeding with the fallback I proposed while the ruling is pending.

**930 → 573 lines (-38%)**.

| file | lines | contents |
|---|---|---|
| `AdvisorPage.tsx` | **573** | score card, insights, challenges, recommendations, export |
| `RetirementSimulator.tsx` | 288 | six inputs, projection, wealth card, 50/30/20 advice |
| `NecessityBreakdown.tsx` | 144 | need-vs-want bar, legend, automated recommendation |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 721/721 across 90 suites.**

#### Step 1 — harness first, validated 5/6 with the sixth proven equivalent

Seven characterization tests. Expected values are taken **from `simulateRetirement` itself** rather than hard-coded: re-deriving compound growth in the test would be a second implementation to get wrong, and — more importantly — it would not notice if the screen stopped calling the engine at all, which is precisely what an extraction breaks.

Six mutants against the untouched original: **5 killed**. The survivor is the `retireAge <= currentAge` short-circuit, and it is an **equivalent mutant**: the retirement-age slider is bound to `min={currentAge + 1}`, so the condition is unreachable through the UI. My first attempt to kill it asserted the output was zero — it wasn't, because the engine always emits a starting point, which is exactly why the guard exists as defence.

Rather than fake coverage, I replaced that test with one that pins the **real** protection: the slider's own bound, including that raising the current age drags the lower bound with it. If anyone ever loosens that binding, the guard stops being decorative and this test is where they find out.

#### Step 2 — extraction

The simulator took all six `useState` calls with it; nothing outside that section read them. The only genuinely shared value is `necessityStats`, which both extracted components consume — the breakdown for its chart, the simulator for its 50/30/20 advice strip.

#### Step 3 — mutation testing on prop wiring: **6/6 killed**

First pass 3/4, then 4/5, then 5/6 — three rounds, each exposing a real gap in my own assertions:

1. **`necessityStats` dropped from the simulator survived.** The advice strip falls back to `|| 50` and `|| 30`, which lands on the *same* message branch as the seeded data, so the mutant was invisible. Fixed by asserting the specific wording, plus a second test proving exactly one of the two branches always renders.
2. **Swapping `needPct`/`wantPct` survived**, because I asserted both numbers appeared *somewhere*. Fixed with a `legendFor()` helper scoping each figure to its own labelled block — and it had to be tightened twice, since the innermost match holds only the percentage while the amount lives one level up.
3. **Swapping the need/want *amounts* survived** even after that, since the percentages were now pinned but the currency figures were not. Both are now asserted per bucket.

That pattern — "assert the value *beside its label*, not merely on the page" — has now caught a real gap in four consecutive directives. It is the single highest-yield check in this work.

### Next Step Proposals

1. **The zakat engine migration**, if you authorise it. Still my first recommendation.
2. Otherwise L-1 continues: `TravelBudget.tsx` (923), `demoData.ts` (875), `cardConstants.ts` (775).
