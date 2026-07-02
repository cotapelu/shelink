# Agent Weakness Profile

**Purpose**: Track known脆弱 modules, error-prone stacks, and high-cost change areas  
**Updated**: After each cycle based on failures and regressions  
**Used by**: Autonomous agent to avoid repeating mistakes

---

## Fragile Modules

Modules với failure rate >5% hoặc repeated issues:

| Module | Reason | Failure Rate | Last Incident | Remediation |
|--------|--------|--------------|---------------|-------------|
| *None currently* | | | |

**Remediation Actions**:
- Add additional tests for error paths
- Refactor to reduce complexity
- Add observability (logs, metrics)
- Review concurrency safety

---

## Error-Prone Stacks

Technologies或patterns dễ sai:

| Stack | Common Mistakes | Mitigation |
|-------|----------------|------------|
| *Baseline in progress* | | |

---

## High-Cost Changes

Areas where modifications consume excessive time/risk:

| Area | Reason | Avg Hours | Rollback Time | Recommendation |
|------|--------|-----------|---------------|----------------|
| *To be identified* | | | | |

---

## Recurring Debt

| Debt Type | Count | Trend | Target Reduction |
|-----------|-------|-------|------------------|
| TODOs/FIXMEs | TBD | ↔️ | -2/week |
| Complexity violations | TBD | ↔️ | -3/week |
| Duplication | TBD | ↔️ | -5 LOC/week |
| Missing tests | TBD | ↔️ | +5 tests/week |

---

## Recent Failures

| Date | Task | Failure Mode | Root Cause | Fix Applied |
|------|------|--------------|------------|-------------|
| *None yet* | | | | |

---

## Lessons Learned

1. TypeScript strict mode catches subtle issues (e.g., numeric label types) – always enable `strict: true`.
2. Test files with extensive mocking may legitimately need `@ts-nocheck`; rule `ban-ts-comment` should allow it for `*.test.ts`.
3. Unused imports/variables accumulate quickly; integrate a linter auto-fix in pre-commit.
4. Replacing `<img>` with `next/image` improves performance metrics and removes Next.js warnings.
5. Stub functions should use parameters in error messages to avoid unused variable warnings.

---

**Last Updated**: 2025-06-30 (Cycle 3 updates)  
**Next Review**: After 5 cycles or when failure rate >5%
