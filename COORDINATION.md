# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 13 — chose option 1, keyboard accessibility sweep (complete)

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 844/844 across 100 suites.** 51 files changed.

#### The defect

A `<div onClick={…}>` is invisible to the keyboard: not in the tab order, and Enter/Space do nothing. Anyone without a pointer — motor impairment, a broken trackpad, a screen-reader user, or simply keyboard-first — **cannot reach the control at all**. That is strictly worse than Directive 11's mislabelled buttons, which at least worked.

The initial scan found **109 clickable non-buttons**. The important work was not patching them but **classifying** them:

| kind | count | treatment |
|---|---|---|
| genuine controls | **50** | `role="button"` + `tabIndex={0}` + Enter/Space handler |
| modal backdrops / dialog containers | 34 | **left alone** |
| propagation guards on modal panels | 25 | **left alone** |

**Not every clickable element should become focusable.** A backdrop that closes a dialog must not be a tab stop — the user would tab onto an invisible full-screen layer, and Escape already provides the keyboard route. A modal's content panel whose only handler is `stopPropagation()` is not a control either: nothing happens when you "activate" it, so making it focusable just lengthens the tab path through every modal. Treating all 109 the same would have been a net regression for 59 of them.

#### The helper

`src/core/a11yKeyboard.ts` — `onActivate()` and `activatable()`, with 11 unit tests. Handling Enter **and** Space matches the native button contract; Space is `preventDefault`ed because it scrolls by default, and propagation is stopped because clickable rows nest inside clickable cards in this codebase, so one keypress would otherwise run two handlers. Centralised because the fix is three things that must arrive together, and at 50 sites one of them would eventually be forgotten.

#### Three bugs in my own sweep, each caught by a different gate

1. **Self-closing tags broke.** Appending attributes to `<div … />` produced `… /\n role="button">`. **TypeScript** caught it — 8 syntax errors in 4 files.
2. **`onClick={jump}` became `() => { jump }`** — an expression statement that evaluates and discards the function. The control would look fixed and do nothing on Enter. **ESLint** caught it via `no-unused-expressions`, 8 occurrences.
3. **The overlay heuristic only matched `fixed inset-0`**, so an `absolute inset-0` backdrop in `InflationCalculator` was made focusable. **My own inverse guard** caught it — the test that asserts backdrops stay *out* of the tab order.

Each was found by a different tool. Worth noting that the inverse guard justified itself immediately: without it, a sweep "fixing" accessibility would have quietly made one modal worse.

#### The guard

`tests/unit/clickableA11y.test.ts`, five tests: the walk covers >100 files, the detector is proven to fire on a bad sample and **not** on good/backdrop/panel samples (including a handler containing `>`, the parser bug from Directive 11), no control lacks the three attributes, no backdrop gains a tab stop, and — reusing the Directive 11 lesson that *a static analysis agreeing with itself is not evidence* — a **rendered** screen is driven with real Enter and Space events.

Verified by reintroducing the original defect on one control: 2 of 5 tests fail, then pass again on restore.

### Next Step Proposals

1. **Scholar review of the zakat exclusion wording** — seven directives running. Still the only outstanding *correctness* risk, and the only item I cannot close myself.
2. `AddCardModal.tsx` (631) remains for L-1.
3. Optional follow-up: the 25 propagation-guard panels are a smell rather than a defect — they exist because the backdrop and content share a click target. Restructuring so the backdrop is a sibling rather than a parent would remove the need for them entirely, but it touches every modal and I would not spend a directive on it unless you want the consistency.
