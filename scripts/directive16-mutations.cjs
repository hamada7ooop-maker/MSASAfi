#!/usr/bin/env node
/**
 * Directive 16 — mutation testing driver.
 * Each mutation regresses one piece of the fetch-error disambiguation (a
 * setError removed, the error propagation severed, the empty-state guard
 * dropped, the retry button deleted). The characterization suite in
 * fetchErrorDisambiguation.test.tsx MUST fail for each one.
 * Run from repo root: node scripts/directive16-mutations.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');

const MUTATIONS = [
  {
    name: 'M1 — useAccounts catch reverted to silent (no setError)',
    file: 'src/features/accounts/hooks/useAccounts.ts',
    from: "      silentFail('[useAccounts] Fetch error')(err);\n      setError(toError(err));",
    to: "      silentFail('[useAccounts] Fetch error')(err);",
    expectFailContains: 'useAccounts: rejects',
  },
  {
    name: 'M2 — useLiveQuerySafe error callback swallowed',
    file: 'src/core/hooks/useLiveQuerySafe.ts',
    from: 'error: err => setState(prev => ({ result: prev.result, error: toError(err) })),',
    to: 'error: () => undefined,',
    expectFailContains: 'useHomeData: live query failure is captured',
  },
  {
    name: 'M3 — TransactionList empty-state guard (!error) dropped',
    file: 'src/features/transactions/components/TransactionList.tsx',
    from: '{transactions.length === 0 && !isLoading && !error && (',
    to: '{transactions.length === 0 && !isLoading && (',
    expectFailContains: 'TransactionList: failed load renders ErrorState',
  },
  {
    name: 'M4 — useSearch catch reverted to silent',
    file: 'src/features/search/hooks/useSearch.ts',
    from: "        silentFail('[Search] Error in useSearch')(err);\n        if (isMounted.current) {\n          setError(toError(err));\n        }",
    to: "        silentFail('[Search] Error in useSearch')(err);",
    expectFailContains: 'useSearch: rejects',
  },
  {
    name: 'M5 — useAdvisorData error propagation severed',
    file: 'src/features/advisor/hooks/useAdvisorData.ts',
    from: 'error: advisorError || homeData.error,',
    to: 'error: null,',
    expectFailContains: 'useAdvisorData: analysis fetch failure',
  },
  {
    name: 'M6 — ErrorState retry button removed',
    file: 'src/components/common/ErrorState.tsx',
    from: '{onRetry && (',
    to: '{false && (',
    expectFailContains: 'renders role=alert with the localized message',
  },
  {
    name: 'M7 — useTransactions catch reverted to silent',
    file: 'src/features/transactions/hooks/useTransactions.ts',
    from: "      silentFail('[useTransactions] Fetch error')(err);\n      if (isMounted.current) {\n        setError(toError(err));\n        setIsLoading(false);\n      }",
    to: "      silentFail('[useTransactions] Fetch error')(err);\n      if (isMounted.current) {\n        setIsLoading(false);\n      }",
    expectFailContains: 'useTransactions: rejects',
  },
  {
    name: 'M8 — Reports view error branch removed',
    file: 'src/features/reports/components/Reports.tsx',
    from: 'if (error) return <ErrorState onRetry={retry} />;',
    to: '/* MUTATION: error branch removed */',
    expectFailContains: 'Reports: failed aggregation renders ErrorState',
  },
];

const runTests = () => {
  try {
    const out = execSync(
      'npx vitest run tests/unit/fetchErrorDisambiguation.test.tsx 2>&1',
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
