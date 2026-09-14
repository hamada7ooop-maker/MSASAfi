#!/usr/bin/env node
/**
 * Directive 15 — mutation testing driver.
 * Each mutation removes or corrupts one of the Tier-3 surfacing fixes;
 * the corresponding characterization test in silentFailSurfacing.test.tsx
 * MUST fail. Run from repo root: node scripts/directive15-mutations.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');

const MUTATIONS = [
  {
    name: 'M1 — restore-failure toast removed (BackupSyncCard)',
    file: 'src/features/settings/components/cards/BackupSyncCard.tsx',
    from: "      toast(t('settings.msg.restoreFailed') || 'فشل استعادة النسخة الاحتياطية', 'error');",
    to: '      /* MUTATION: toast removed */',
    expectFailContains: 'BackupSyncCard — restore failure',
  },
  {
    name: 'M2 — card-delete toast removed (BankCardsManager)',
    file: 'src/features/cards/components/BankCardsManager.tsx',
    from: "          toast(getTxt('deleteFailed'), 'error');",
    to: '          /* MUTATION: toast removed */',
    expectFailContains: 'BankCardsManager — card delete failure',
  },
  {
    name: 'M3 — save-error message reverted to misleading fillAll (AddCardModal)',
    file: 'src/features/cards/components/AddCardModal.tsx',
    from: "      toast(getTxt('saveFailed'), 'error');",
    to: "      toast(getTxt('fillAll'), 'error');",
    expectFailContains: 'AddCardModal — card save failure',
  },
  {
    name: 'M4 — settings rollback + toast removed (useSettings)',
    file: 'src/features/settings/hooks/useSettings.ts',
    from: `      setSettings(prev => ({ ...prev, [key]: previousValue }));
      toast(t('common.error') || 'Error', 'error');`,
    to: '      /* MUTATION: rollback + toast removed */',
    expectFailContains: 'useSettings — failed setting persistence',
  },
  {
    name: 'M5 — export-failure toast removed (ReportBuilderModal)',
    file: 'src/features/reports/components/ReportBuilderModal.tsx',
    from: "      toast(t('report.exportFail') || 'فشل التصدير', 'error');",
    to: '      /* MUTATION: toast removed */',
    expectFailContains: 'ReportBuilderModal — export failure',
  },
  {
    name: 'M6 — trip-delete toast removed (TravelBudget)',
    file: 'src/features/budgets/components/TravelBudget.tsx',
    from: "        toast(t('travel.errDelete') || 'حدث خطأ أثناء الحذف', 'error');",
    to: '        /* MUTATION: toast removed */',
    expectFailContains: 'TravelBudget — trip delete failure',
  },
];

const runTests = () => {
  try {
    const out = execSync('npx vitest run tests/unit/silentFailSurfacing.test.tsx --reporter=verbose 2>&1', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180000,
    });
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
  const targetFailed = !passed && clean.includes(m.expectFailContains) && /×|FAIL/.test(clean);
  // A mutation is "killed" when the suite fails AND the targeted test is among the failures.
  const summary = clean.match(/Tests\s+(\d+ failed \| )?(\d+) passed( \((\d+)\))?/);
  if (!passed && targetFailed) {
    killed++;
    console.log(`✅ KILLED   ${m.name}`);
  } else if (!passed) {
    console.log(`⚠️  SUITE FAILED but target unclear — inspect: ${m.name}`);
    console.log(clean.split('\n').filter(l => /×|✓|Tests /.test(l)).join('\n'));
  } else {
    console.log(`❌ SURVIVED ${m.name} — the characterization test did NOT catch it!`);
  }
  fs.writeFileSync(m.file, original); // revert
}

console.log(`\n=== ${killed}/${MUTATIONS.length} mutants killed ===`);
process.exit(killed === MUTATIONS.length ? 0 : 1);
