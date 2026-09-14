# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 11 — chose the A11y sweep (option 1), complete

I took the sweep over the file splits because the sweep fixes a **defect** while a split improves maintainability, and the measurement settled it: a first scan found **85 unlabelled icon-only buttons across 55 files** — essentially every screen. `gemini.ts` and `AddCardModal.tsx` will still be 680 and 631 lines next week; users relying on a screen reader were locked out today.

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 804/804 across 97 suites.** 109 files changed.

#### The defect

Material Symbols draws icons from **ligature text**: `<span className="material-symbols-outlined">delete</span>` puts the literal word in the DOM and the font renders a bin over it. When that span is a button's only content, the button's accessible name *becomes the ligature*. Users heard **"close"**, **"bolt"**, **"content_copy"**, **"keyboard_arrow_up"** — font internals. Two of those are not even words.

The final tally was larger than the first scan suggested: **~135 buttons** labelled plus **~45 icon spans** marked `aria-hidden`, because the initial count itself was understated (see below).

#### What was done

- `aria-label` on every icon-only button, drawn from existing `action.*` keys wherever they already existed; **16 new keys** added across all 11 locales.
- `aria-hidden="true"` on every decorative icon span inside a labelled button — without it the ligature is appended and the user hears *"delete transaction delete"*.
- State-aware labels where the icon changes meaning: the FAB announces Close/Add and carries `aria-expanded`; arcade D-pads announce Move up/down/left/right; dynamic pickers announce their own item (`Account: الحساب الجاري`, `Format: pdf`).
- Ten arcade components destructured only `isRTL` from `useI18n`; `t` was added. **TypeScript caught this**, not me — a reminder that a scripted sweep needs a compiler behind it.

#### Two mistakes in my own tooling, both caught by evidence rather than reasoning

**1. A broken parser under-reported the problem.** My detector stripped tags with `<[^>]*>`, but a handler like `onClick={() => setX(1)}` contains a `>`, so the regex ended the opening tag early and leaked attribute source into what it considered "visible text". Buttons with no label looked labelled. Fixed by scanning for the tag's closing `>` at brace depth zero.

**2. The static scan alone would have shipped the bug.** I added a **rendered cross-check** that mounts a real screen and computes accessible names the way a screen reader does. It failed immediately on `Accounts.tsx` — a `delete` button the source scan had passed. That is what exposed mistake 1.

The lesson I would generalise: **a static analysis that agrees with itself is not evidence.** The render test cost twenty lines and caught what 55 files of scanning missed.

#### The guard

`tests/unit/iconButtonA11y.test.ts` — five tests:

1. the walk finds >100 component files (so the sweep cannot pass vacuously);
2. the detector fires on a known-bad sample and **not** on labelled, text-bearing or dynamic-icon samples;
3. no icon-only button lacks an accessible name, reporting `file:line (reads aloud as "…")`;
4. no labelled button leaves its icon span exposed;
5. a rendered screen announces actions, never ligatures.

The allowlist is deliberately **empty**. An allowlist that grows is a rule being abandoned one entry at a time.

### Next Step Proposals

1. **Scholar review of the zakat exclusion wording** — unchanged, five directives running. It is the only outstanding *correctness* risk in the codebase.
2. This sweep covered `<button>`. The same defect class likely exists on clickable `<div>`s and `<span>`s with `onClick`, which additionally lack keyboard access — a related but distinct pass.
3. L-1 continues: `gemini.ts` (680), `AddCardModal.tsx` (631).
