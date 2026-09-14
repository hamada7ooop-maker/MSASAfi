# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 14 — `AddCardModal.tsx` deconstructed (complete)

**632 → 307 lines (-51%)**, at the 300 target.

| file | lines | responsibility |
|---|---|---|
| `AddCardModal.tsx` | **307** | sheet scaffolding, validation, save/update branch |
| `CardFormFields.tsx` | 243 | country, bank, number, holder, expiry, CVV inputs |
| `useBinDetection.ts` | 143 | BIN lookup and its country/bank/style mapping |
| `CardVisualPreview.tsx` | 68 | the 3D preview and its flip |
| `CardStylePicker.tsx` | 54 | theme swatch grid |
| `cardInputFormat.ts` | 44 | pure input formatters |
| `cardText.ts` | 26 | shared dictionary lookups |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 876/876 across 102 suites.**

#### Where the boundaries were drawn, and why

**All validation stayed in the parent's `handleSave`.** The fields component formats input; it does not decide what is acceptable. Splitting that judgement across two files is how a UI starts accepting data the persistence layer rejects — the user sees a green form and an opaque failure.

**`useBinDetection` is the only part that touches the network.** Isolating it means a reviewer asking "what does the card screen send externally?" reads one 143-line file rather than scanning a 632-line component. It also fails soft by contract: a failed lookup must never overwrite what the user typed.

**`cardInputFormat.ts` turned untestable rules into testable ones.** The expiry clamping — month `13` → `12`, month `00` → `01`, Arabic-Indic digits accepted because the app ships an Arabic keyboard — previously required mounting the whole sheet to exercise. It now has 15 direct unit tests.

#### Step 1 — harness validated 9/10, with the survivor proven equivalent

14 characterization tests. The survivor was `.toUpperCase()` in `handleSave`: I confirmed by reading the field that its `onChange`, `onBlur` **and** `onCompositionEnd` all uppercase on the way in, so the state is never lowercase by the time save runs. It is defence in depth for a future path that sets the value directly — recorded in a comment rather than covered with a test that cannot fail.

#### Step 3 — prop wiring: 7/9 → **11/11 killed**

Four rounds. Three of the survivors were genuine blind spots worth naming:

- **The live preview was never asserted against typed input.** Freezing `cardNumber` left it showing placeholder digits while the user typed a real card — precisely the silent divergence an extraction causes, and the preview's entire purpose is to show what will be saved.
- **`onFocusCvv` had no coverage.** The CVV is printed on the reverse, so focusing that field must flip the card; without it the user types a number against a picture of the front.
- **`activeStyle` frozen to `CARD_STYLES[0]` was initially indistinguishable**, because that *is* the default. Only asserting the preview repaints *after* the user picks gold separates them — a reminder that a mutant matching the default state needs a test that moves away from it first.

Two mutation patterns also matched twice in the file and were re-written with wider context rather than scored as ambiguous.

### Next Step Proposals

1. The >600-line list from `AUDIT_REPORT.md` is now **fully cleared** — `AddCardModal` was the last entry. Remaining large files are `demoData.ts` (875) and `cardConstants.ts` (775), both static data where a split would relocate content without reducing any component's complexity. I would not spend a directive on either unless you want the consistency.
2. The 25 propagation-guard panels noted in Directive 13 remain a structural smell: they exist because backdrop and content share a click target. Making the backdrop a sibling would remove them, but it touches every modal.
3. With L-1 essentially complete, I would suggest the next phase target **behaviour rather than structure** — for example a pass over the `silentFail` call sites to check which failures are genuinely safe to swallow, since that pattern now appears widely and each instance is a decision that was made once and never revisited.
