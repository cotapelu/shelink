## Description

[Provide a brief description of the changes and the rationale. Link to any relevant issues.]

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (code restructuring with no functional changes)
- [ ] Performance improvement
- [ ] Documentation update

## Quality Checklist (Self-Score /100)

**Mandatory (Fail if not checked)**
- [ ] All tests pass (no failing tests)
- [ ] No new lint errors introduced (`npm run lint`)
- [ ] TypeScript type-check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] No PII in logs or error messages
- [ ] Rate limiting considered (if applicable)

**Security**
- [ ] Input validation added/updated (Zod schemas)
- [ ] SQL injection safeguards (Prisma parameterized queries only)
- [ ] Authorization checks present (server actions/permissions)
- [ ] XSS prevention reviewed (output encoding)
- [ ] CSRF tokens present (state-changing operations)

**Testing**
- [ ] Unit tests added for new logic
- [ ] Error paths covered
- [ ] Edge cases tested (null, empty, boundary)
- [ ] Integration tests added (if applicable)
- [ ] Branch coverage ≥80% for modified modules

**Performance**
- [ ] No O(n²) patterns introduced
- [ ] No N+1 queries (eager loading used appropriately)
- [ ] No blocking I/O in async contexts
- [ ] Queries use indexes (verified with EXPLAIN if needed)

**Observability**
- [ ] Structured logging used (JSON format)
- [ ] Correlation ID propagated (if cross-service)
- [ ] Metrics recorded (business metrics if applicable)
- [ ] Errors logged with context (request ID, user ID)

**Documentation**
- [ ] JSDoc added for public APIs (functions, classes)
- [ ] README updated (if user-facing changes)
- [ ] ADR written for architectural decisions (if applicable)

**Code Quality**
- [ ] Functions ≤20 lines (split if longer)
- [ ] Cyclomatic complexity ≤10
- [ ] No duplicated code (>5 lines)
- [ ] No unused imports/code
- [ ] Match existing code style

## Self-Score (out of 100)

Score: __ /100

**Breakdown**:
- Mandatory checks: 40 pts
- Security: 20 pts
- Testing: 15 pts
- Performance: 10 pts
- Observability: 5 pts
- Documentation: 5 pts
- Code Quality: 5 pts

## Reviewer Focus Areas

[What should reviewers pay special attention to? Security, performance, architecture, edge cases?]

## Screenshots / Logs

[If UI change or debugging logs, attach here]

## Verification Steps

How to test this change locally:

```bash
# Example:
npm run dev
# Navigate to http://localhost:3000/...
# Test: ...
```

## Breaking Changes (if any)

[List any breaking changes and migration path]

## Related Issues / Tickets

- Closes #
- Related to #
- Depends on #

## Additional Notes

[Any other information for reviewers]
