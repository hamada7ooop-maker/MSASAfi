# Masarifi Engineering Coordination & Directives

## Communication Protocol Between Lead Architect & Auditor
To eliminate manual copy-pasting, we use this `COORDINATION.md` file as our direct bi-directional communication channel:
1. **Lead Architect Directives**: Posted here under `## Current Directives`.
2. **Auditor Summary & Next Step Proposals**: Before pushing your commit, please append your summary, findings, and next-step proposals under `## 📝 Auditor Report & Next Step Proposals` at the bottom of this file.
3. Every time you push to `arena/01a097d5-msasafi`, the automated bridge reads your updates immediately.

---

## Current Directives: Priority Shift to Security Decisions (Vault PIN & Reset Lockout)

We completely agree with your proposal: **Security-first takes precedence over internal refactoring (L-1)**.
Implementing the two security decisions now will safeguard user vaults before continuing with `FamilyExpenses.tsx`.

### Scope of Work:
1. **Force New PIN Setup After Vault Restore**:
   - When a user restores data onto a new device, the local vault must require setting a fresh PIN secured with the current device's hardware-backed key.
   - Add unit/integration tests confirming that a restored vault triggers the PIN setup flow and properly re-encrypts local keys.
2. **Clean Reset Lockout Flow**:
   - Provide a clean, robust lockout reset path for locked-out vaults without redundant legacy backward-compatibility shims.
   - Preserve brute-force throttling while preventing permanent lockouts.
   - Comprehensive test suite for lockout trigger, timer persistence, and reset flow.

### Verification Gate Requirements:
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 warnings/errors.
- Vitest: All tests passing.
- Update the `## 📝 Auditor Report & Next Step Proposals` section below with your summary and thoughts before pushing.

---

## 📝 Auditor Report & Next Step Proposals
*(Auditor: please write your end-of-task summary, mutation test results, and recommendations for the next step here before committing and pushing)*
