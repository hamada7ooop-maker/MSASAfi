# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals

### Directive 12 — chose option 1, `gemini.ts` modularized (complete)

**679 → 151 lines (-78%)**, well under the 250 target.

| file | lines | responsibility |
|---|---|---|
| `core/gemini.ts` | **151** | orchestration: guards, provider fan-out, error mapping |
| `core/ai/providers.ts` | 310 | transport for Gemini / Groq / custom / free endpoints |
| `core/ai/contextBuilder.ts` | 136 | builds the financial summary sent as system context |
| `core/ai/providerKeys.ts` | 123 | credential storage and provider selection |
| `core/ai/rateLimiter.ts` | 90 | throttling, cancellation, prompt-injection sanitiser |

**Gate: tsc 0 · eslint 0 · build 0 · guardian 189 tips clean · 828/828 across 98 suites.**

#### The split follows the risk, not the line count

The boundaries were chosen so each **security-relevant decision lives in exactly one reviewable file**:

- `providerKeys.ts` decides **which third party receives the user's financial summary** — a privacy boundary. Keys stay in `secureStore` (encrypted Preferences), never in the Dexie settings table, so they are not swept into a local backup.
- `contextBuilder.ts` decides **what personal data leaves the device**. A reviewer asking "what do we actually send?" now has one file to read instead of hunting through transport code.
- `rateLimiter.ts` holds the **prompt-injection defence**. That matters more than it looks: the prompt interpolates transaction descriptions and category names, which can be attacker-influenced through an SMS-imported merchant name or a shared budget label. The module keeps its own clock, because a limiter whose state lives in the caller gives every caller a fresh allowance.

**`src/features/chatbot/` has an empty diff.** The moved API is re-exported from `gemini.ts`, so the split stayed internal and did not ripple into feature code.

#### Step 1 — harness validated 9/10, then 10/10

23 characterization tests. Each of the eight injection patterns is asserted **individually**, so a regex dropped in a refactor fails on its own rather than hiding behind the others. The one survivor was the ≥4-character key check; covered, then killed.

#### Two fixture bugs of mine, both worth recording

1. **`secureStore` is not Dexie.** My `wipe()` cleared the database only, so an API key saved by one test stayed visible to the next. A test asserting "no provider configured" therefore reached the network stub and failed with a confusing `network_error` from the *end* of `askGemini` rather than the `no_api_key` guard at the top. The fixture now clears both stores.
2. **`vi.stubGlobal('navigator', …)` leaks.** Replacing the whole navigator object left later tests seeing a permanently offline app. Overriding just `onLine` via `defineProperty`, restored in a `finally`, is the contained form.

Both produced *plausible* failures pointing at the wrong layer. Worth remembering: when a test fails with an error from a different guard than the one under test, suspect the fixture before the source.

#### Step 3 — prop/module wiring: **10/10 killed**, no equivalents

Mutants spanned all three new boundaries — bypassing the sanitiser, zeroing the limiter window, reordering provider preference, accepting short keys, removing the offline and no-key guards. Every one was caught.

### Next Step Proposals

1. **Scholar review of the zakat exclusion wording** — six directives running, still the only outstanding *correctness* risk.
2. **Option 3 from this directive is still open and I would rank it next**: clickable `<div>`/`<span>` elements with `onClick` have the same a11y defect as the buttons I fixed, *plus* they are unreachable by keyboard entirely — a strictly worse failure than a mislabelled button.
3. `AddCardModal.tsx` (631) remains for L-1.
