#!/usr/bin/env node
/**
 * Directive 17 (item 3) — mutation testing driver.
 * Each mutation regresses one piece of the isLoading "first result"
 * semantics (the flag never set, the old dead comparison restored, an
 * error-vs-skeleton guard dropped, the advisor compound loading flag or its
 * guard reverted, the effect dep severed). The characterization suite in
 * firstResultLoading.test.tsx MUST fail for each one.
 * Run from repo root: node scripts/directive17-loading-mutations.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');

const MUTATIONS = [
  {
    name: 'M1 — useLiveQuerySafe: first emission no longer sets hasFirstResult',
    file: 'src/core/hooks/useLiveQuerySafe.ts',
    from: 'next: value => setState({ result: value, error: null, hasFirstResult: true }),',
    to: 'next: value => setState({ result: value, error: null, hasFirstResult: false }),',
    expectFailContains: 'hasFirstResult false → true on first emission',
  },
  {
    name: 'M2 — useHomeData: isLoading reverted to the dead `=== undefined` comparison',
    file: 'src/features/home/hooks/useHomeData.ts',
    from: 'isLoading: !(recentTxnLoaded && budgetsLoaded && statsLoaded),',
    to: 'isLoading: recentTransactions === undefined || allBudgets === undefined || monthlyStats === undefined,',
    expectFailContains: 'isLoading is TRUE while the first query is still pending',
  },
  {
    name: 'M3 — ClassicDashboard: skeleton guard loses `&& !error` (error hidden behind eternal skeleton)',
    file: 'src/features/home/components/ClassicDashboard.tsx',
    from: 'if (isLoading && !error) {',
    to: 'if (isLoading) {',
    expectFailContains: 'ClassicDashboard: early failure renders ErrorState',
  },
  {
    name: 'M4 — useAdvisorData: compound isAdvisorLoading loses the error guard',
    file: 'src/features/advisor/hooks/useAdvisorData.ts',
    from: 'isAdvisorLoading: isAdvisorLoading || (homeData.isLoading && !homeData.error),',
    to: 'isAdvisorLoading: isAdvisorLoading || homeData.isLoading,',
    expectFailContains: 'does not stall the analysis effect',
  },
  {
    name: 'M5 — useAdvisorData: early-failure guard reverted (waits forever)',
    file: 'src/features/advisor/hooks/useAdvisorData.ts',
    from: 'if (homeData.isLoading && !homeData.error) return;',
    to: 'if (homeData.isLoading) return;',
    expectFailContains: 'does not stall the analysis effect',
  },
  {
    name: 'M6 — useAdvisorData: homeData.error severed from the effect deps',
    file: 'src/features/advisor/hooks/useAdvisorData.ts',
    from: '    homeData.isLoading,\n    homeData.error,\n    homeData.monthlyStats,',
    to: '    homeData.isLoading,\n    homeData.monthlyStats,',
    expectFailContains: 'does not stall the analysis effect',
  },
];

const runTests = () => {
  try {
    const out = execSync(
      'npx vitest run tests/unit/firstResultLoading.test.tsx 2>&1',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 240000 }
    );
    return { passed: true, out };
  } catch (e) {
    return { passed: false, out: (e.stdout || '') + (e.stderr || '') };
  }
};

const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

let killed = 0;
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file, 'utf8');
  if (!original.includes(m.from)) {
    console.log(`❌ ${m.name}\n   ANCHOR NOT FOUND — fix the driver script.`);
    continue;
  }
  fs.writeFileSync(m.file, original.replace(m.from, m.to));
  const { passed, out } = runTests();
  const clean = stripAnsi(out);
  if (!passed && clean.includes(m.expectFailContains)) {
    killed++;
    console.log(`✅ KILLED   ${m.name}`);
  } else if (!passed) {
    console.log(`⚠️  SUITE FAILED but target unclear — inspect: ${m.name}`);
  } else {
    console.log(`❌ SURVIVED ${m.name} — the characterization test did NOT catch it!`);
  }
  fs.writeFileSync(m.file, original); // revert
}

console.log(`\n=== ${killed}/${MUTATIONS.length} mutants killed ===`);
process.exit(killed === MUTATIONS.length ? 0 : 1);
