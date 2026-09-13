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

### ⚠️ Fiqh defect found — needs your ruling before I touch it

While reading the file I found something that is **not** a refactoring matter, so I have changed nothing and am reporting it instead.

**The screen does not use `core/zakatEngine.ts` at all.** It re-implements the calculation inline (lines 311–315), and the two disagree on which wealth is zakatable:

| | base for the 2.5% | liabilities | hawl |
|---|---|---|---|
| `zakatEngine.ts` (tested, from `65f5c89`) | cash + gold + investments + trade goods | deducted | tracked |
| the screen users actually see | **every bucket, including livestock, crops and real estate** | ignored | ignored |

Worked example at gold 500/g (nisab 42,500): a user with 5,000 cash, 40,000 livestock, 20,000 crops and 100,000 property is told they owe **4,125**. By the engine's rules they owe **nothing** — their monetary wealth is 5,000, far below nisab, and the other three buckets carry entirely different obligations (crops 5/10% at harvest, livestock in-kind, property exempt as an asset).

The engine's own test suite asserts this exclusion explicitly, and `core/ai/calculator.ts` already delegates to it. Only the user-facing screen was never migrated.

I did not fix it because your directive was explicit that fiqh rules are out of scope for this task, and because **over-charging zakat is a religious harm, not a bug I should quietly patch inside a refactoring commit.** It deserves its own change, its own review, and possibly a scholar's confirmation of the migration. My characterization test `CURRENT BEHAVIOUR: also sweeps livestock into the 2.5% base` pins today's behaviour and carries a comment saying it must be **inverted** when the engine is adopted.

**Recommendation:** authorise a separate directive to wire the screen to `calculateZakat()`. It is a contained change — the screen already has every input the engine needs except liabilities.

### Directive 5 — `ZakatCalculator.tsx` modularized (complete)

**964 → 423 lines (-56%)**, comfortably under the 550 target.

| file | lines | contents |
|---|---|---|
| `ZakatCalculator.tsx` | **423** | state, persistence, all arithmetic, tab switch |
| `GoldSmartCalcModal.tsx` | 302 | karat-itemised gold sheet |
| `ZakatNisabBanner.tsx` | 188 | due banner, nisab selector, metal prices |
| `ZakatHistoryTab.tsx` | 127 | saved calculations + breakdown |
| `ZakatAssetsEditor.tsx` | 110 | the asset rows |
| `AnimatedNumber.tsx` | 78 | count-up, already reduced-motion aware |
| `assetMeta.ts` | 28 | shared label/icon metadata |

**Fiqh invariant honoured.** `git diff` on `src/core/zakatEngine.ts` is empty, and `grep` confirms `0.025`, `85` and `595` still appear in exactly one file — the parent. Every extracted component receives `zakatAmount`, `nisab`, `isAboveNisab`, `goldValue` and `equivalentWeight` as props and performs no zakat arithmetic. The prop docs say so explicitly, because the danger with this file is not a broken render but a second, divergent answer to a religious question.

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 712/712 across 89 suites (run twice).**

#### Step 1 — harness first, validated at 9/9

Eight characterization tests, then nine deliberate mutations against the untouched original. Two rounds were needed:

- **First pass 7/8.** The silver-nisab test survived two mutants because silver is a **Pro perk** — my test clicked a locked button and asserted nothing. Granting the entitlement fixed it.
- Then a subtler one: `expect(digits).toContain('250')` also matches inside `'2500'`, so a mutated nisab producing a ten-fold amount still passed. Replaced with exact numeric parsing, and the silver test now uses 2,000 (below the real 5,355 threshold, above a shrunken one) so it pins the **595 grams** specifically rather than "some silver threshold".

Also worth recording: the banner animates over a second with `requestAnimationFrame`, so early reads caught meaningless intermediate values. Rather than wait it out or fight rAF with fake timers, the suite declares a reduced-motion preference — `AnimatedNumber` already snaps under it, so the tests are both fast and exercising the accessibility path real users get.

#### Step 2 — presentational decomposition

State ownership stayed with the parent throughout, deliberately: unlike the previous three files, almost nothing here is safe to relocate, because the "state" is the calculation. The one thing that did move out was two inline `DB.setSetting` calls in the price inputs — persistence is the parent's job, so those now travel through `onGoldPriceChange` / `onSilverPriceChange`.

#### Step 3 — mutation testing on prop wiring: **17/17 killed**

Three rounds, and the first was poor: **7/12**. The survivors were all things nothing clicked — a dead save button, an emptied history list, a frozen selector, a forced Pro flag, a zeroed gold value. Two rounds of added tests closed every one, including two `isPro` threads that must be tested **separately**: forcing it true on the history tab alone leaks saved calculations to non-subscribers, which the banner test could not see.

No equivalent mutants this time — all 17 are genuinely observable.

### Next Step Proposals

1. **The zakat engine migration above**, if you authorise it. I would rank it above further L-1 work: it is a correctness issue in the one feature where being wrong has consequences beyond money.
2. Otherwise L-1 continues: `AdvisorPage.tsx` (930), `TravelBudget.tsx` (923), `demoData.ts` (875).

**Housekeeping:** the sandbox rewound again before this task, losing `node_modules` and the branch pointer. All files verified byte-identical against `origin/arena/01a097d5-msasafi`, reset to `de1f4d1`, reinstalled. Nothing lost. This is the eighth occurrence; everything remains pushed after each task, which is why it keeps costing only a few minutes.
