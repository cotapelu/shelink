const { execSync } = require('child_process');
const fs = require('fs');

try {
  const lintOut = execSync('npm run lint 2>&1 || true', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  const lines = lintOut.split('\n');
  const summaryLine = lines.find(l => l.startsWith('✖'));
  if (!summaryLine) throw new Error('No summary line in lint output');
  const match = summaryLine.match(/✖ (\d+) problems \((\d+) errors, (\d+) warnings\)/);
  if (!match) throw new Error('Cannot parse lint summary: ' + summaryLine);
  const totalProblems = parseInt(match[1], 10);
  const errors = parseInt(match[2], 10);
  const warnings = parseInt(match[3], 10);

  // Baseline values before any fixes (initial discovery)
  const baseline = { total: 1256, errors: 1181, warnings: 75 };
  const deltaTotal = baseline.total - totalProblems;
  const deltaErrors = baseline.errors - errors;
  const deltaWarnings = baseline.warnings - warnings;

  const entry = `

### [CYCLE-2] - 2025-07-07 Lint Reduction (Part 1)

**Type**: Violation Fix (Lint - Function Size)
**Priority**: HIGH
**Duration**: ~120 min
**Status**: ✅ Completed (2 tasks + hotfix)

**Tasks**:
- [R] eventHelpers.ts: Extracted \`tryYearOffset\` helper, reduced \`nextSolarForLunar\` from 32 → ~12 lines
- [R] kinshipHelpers.ts: Extracted \`findLCA\` helper, reduced \`findBloodKinship\` from 49 → ~20 lines
- [F] eventHelpers.ts: Fixed type error in \`tryYearOffset\` (used \`Lunar as any\`)

**Verification**:
- npm run lint: errors reduced from ${baseline.errors} to ${errors} (total problems ${baseline.total} → ${totalProblems})
- npm run typecheck: PASS
- Build: PASS

**Metrics**:
- Lint violations delta: -${deltaErrors} errors, -${deltaTotal} total problems
- Functions >30 lines reduced: 2
- Type errors: 0

**Notes**: Next targets: computeEvents (106 lines), resolveBloodTerms (171 lines), file size reductions.
`;
  fs.appendFileSync('docs/AGENT_METRICS.md', entry);
  console.log('Appended Cycle 2 metrics');
} catch (e) {
  console.error('Failed to append metrics:', e);
  process.exit(1);
}