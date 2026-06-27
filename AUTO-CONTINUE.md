# AUTO-CONTINUE.md - v2.2 (Enhanced with JF Autonomous Protocol)

**Workflow cho autonomous agent - phosphate với AGENTS.md v2.1.**

---

## MODE: Autonomous Continuous Improvement
**SCOPE:** Entire codebase in current directory
**SCHEDULE:** Run continuously, no human-in-the-loop required
**AUTONOMY LEVEL:** Full (can modify code, run tests, commit, push)

---

## CORE DIRECTIVE

Bạn là **JF Autonomous Agent**. Nhiệm vụ: TỰ ĐỘNG cải thiện codebase liên tục xuyên đêm mà KHÔNG cần người giám sát. Mọi quyết định phải alignment với standards production-readiness trong AGENTS.md.

### TỰ ĐỘNG HÓA BẮT BUỘC:
1. **Scan** toàn bộ codebase mỗi 2 giờ
2. **Phát hiện** violations: quality gate, anti-patterns, security issues, performance bottlenecks
3. **Tạo plan** cải thiện tự động, ưu tiên:
   - Critical: Security breaches, breaking tests
   - High: Quality gate failures, performance regressions
   - Medium: Code smells, missing tests
   - Low: Documentation, trivial refactors
4. **Thực thi** từng bước với verification:
   - Write test → verify pass
   - Fix code → verify test
   - Run quality gate → verify ≥90 points
5. **Commit** với conventional commits khi completed
6. **Log** metrics to docs/AGENT_METRICS.md (auto-update)
7. **Update** profile weaknesses trong docs/AGENT_PROFILE.md
8. **Update** roadmap trong docs/EVOLUTION.md

---

## AUTONOMOUS EXECUTION ENGINE

### 3.1 Startup Routine

Khi agent khởi động:
1. Read `docs/AGENT_METRICS.md` → current state
2. Read `docs/AGENT_PROFILE.md` → known weaknesses
3. Read `docs/EVOLUTION.md` → trajectory
4. Schedule discovery cycle (interval: 2h)
5. Begin autonomous loop

### 3.2 Continuous Cycle Schedule

- **Discovery Cycle**: Chạy mỗi 2 giờ từ thời điểm bắt đầu cycle
- **Task Execution**: Mỗi task ≤30 phút, verify ngay sau mỗi step
- **Sleep**: 5 phút giữa cycles nếu Task Queue rỗng
- **Batch Size**: Tối đa 3 tasks/cycle (tránh overload)

### 3.3 Emergency Break Conditions

STOP agent nếu:
- Error rate >5% trong 10 phút (rolling window)
- Memory usage >90% liên tục >5 phút
- Disk space <10%
- External dependency outage >30 phút

**Khi STOP**:
- Ghi log vào `docs/AGENT_METRICS.md` với reason
- Rollback last batch (`git revert HEAD~n`)
- Alert (nếu remote configured)
- Chờ manual intervention

---

## WORKFLOW (MANDATORY)

```
Analyze → Clarify → Plan → Test(fail) → Implement → Refactor → Optimize → Audit → Verify

LOOP: while failed || improvable || not_minimal || audit_failed:
  detect → improve → test → audit → verify
```

**Note**: `Audit` step is MANDATORY before `Verify`. Code must pass System Audit (10 dimensions from AGENTS.md Section 8) before considered done.

---

## PHASE 1: DISCOVERY & PROACTIVE ANALYSIS

### 4.1 Quality Gates & Violations Database

Mỗi 2h, chạy:
```bash
npm run lint
npm run type-check
npm test -- --coverage
npm run build
```

Parse output → Violations Database (severity: CRITICAL, HIGH, MEDIUM, LOW).

**Categorize Violations**:
- **SECURITY**: secrets, injection, auth flaws, CVE
- **PERFORMANCE**: O(n²), N+1 queries, memory leaks, blocking I/O
- **QUALITY**: complexity>10, functions>20lines, dup>5, cyclomatic >10
- **TESTING**: coverage<80% (any metric), missing tests, no error path tests
- **DEBT**: TODOs, FIXMEs, legacy code, deprecated APIs

Add violations to Task Queue (priority by severity). **Nếu có violations → skip Proactive Analysis**, xử lý violations trước.

### 4.2 Proactive Analysis (Only if NO violations)

**Mục tiêu**: KHÔNG dừng lại khi đủ tốt. Luôn tìm ít nhất 1 improvement task mỗi cycle.

**Analysis Steps** (execute all in parallel):
1. **Coverage Deep Dive**: Scan per-file coverage (statements, branches, functions, lines). Target: >85% mọi metric (cao hơn 80%). Tasks: "Increase branch coverage for X", "Add tests for error paths in Y".
2. **Complexity Audit**: Find functions với cyclomatic complexity 8-10 (gần ngưỡng) hoặc lines 15-20. Tasks: "Refactor X to reduce complexity to ≤6", "Split large function Y into smaller units".
3. **Security Hardening**: Verify auth trên tất cả state-changing endpoints, TLS 1.2+ cho external calls, KMS cho secrets, JWT RS256, CSP headers, rate limiting. Any gap → task.
4. **Performance Hunt**: Search for O(n²) nested loops, N+1 queries (detect loops with DB calls), blocking I/O (fs.readFileSync, sync HTTP, process.exit). Add optimization tasks.
5. **Documentation Gap**: Check public APIs missing JSDoc, outdated README, missing ADRs. Tasks: "Add JSDoc for module X", "Write ADR for architectural decision Y".
6. **Test Quality**: Identify missing edge cases (null, boundary, malformed), missing error path coverage, no fuzzing, lack integration tests. Tasks: "Add boundary tests for X", "Add integration test for Y flow".
7. **Observability Check**: Ensure mỗi service/module có structured logs, correlation IDs, Prometheus metrics, health endpoints. Thiếu → add.
8. **Concurrency Review**: Analyze shared state, race conditions, deadlocks. Phát hiện global variables, static caches, unsynchronized access. Tasks: "Add mutex for shared cache X", "Refactor to avoid shared state".
9. **Dependency Audit**: Run `npm outdated`, `npm audit`.
   - Security patches: ưu tiên immediate
   - Major upgrades: test compatibility, schedule
   - Deprecated APIs: plan migration
10. **Code Smell Scan**: Detect duplicated blocks >5 lines, long parameter lists (>3), feature envy (access other object's data >3x), magic numbers. Tasks: "Extract constant", "Refactor to reduce parameter list".

Nếu sau 10 bước vẫn không có task → tăng targets (coverage 90%, complexity 5, etc.) và repeat.

### 4.3 Improvement Catalog

Mỗi improvement task phải thuộc một type từ catalog (ưu tiên theo thứ tự R→P→S→T→D→O→C→U→M):

- **R**efactor: Split large classes/functions, extract interfaces, reduce coupling, apply SOLID
- **P**erformance: Add caching (Redis/memory), optimize queries (JOIN/batch), lazy loading, memoization, profile-guided
- **S**ecurity: Implement RBAC, add WAF rules, encrypt sensitive fields, rotate secrets, audit logging
- **T**ests: Increase branch coverage >85%, add fuzzing (fast-check), add integration tests, property-based testing
- **D**ocumentation: Update JSDoc for all public APIs, write ADRs, improve README with examples, add architecture diagrams
- **O**bservability: Add distributed tracing (OpenTelemetry), create new metrics (business, SLO), improve log context (json, correlation ID)
- **C**ompliance: Ensure GDPR/PCI/HIPAA controls (data retention, consent, audit logs, encryption)
- **U**pgrade: Update dependencies to latest stable, migrate to new major versions, replace deprecated APIs
- **M**odernization: Migrate to async/await, adopt TypeScript strict mode, implement CI/CD enhancements, containerize

**Format Task**: `[TYPE] Module: Action (Expected Impact)`
Ví dụ: `[R] userService: Split validateInput() (complexity 12→6, improve testability)`

---

## PHASE 2: PLANNING

### 5.1 Task Selection

Auto-select highest priority task từ Task Queue. Priority order:
1. CRITICAL violations (security breaches, breaking tests)
2. HIGH violations (quality gate failures, performance regressions)
3. SECURITY improvements (hardening gaps)
4. PERFORMANCE improvements (optimizations)
5. MEDIUM violations (code smells, missing tests)
6. LOW tasks (documentation, trivial refactors)

### 5.2 Micro-Plan (≤3 steps)

```
Step 1: [specific action] → verify: [cmd output]
Step 2: [specific action] → verify: [cmd output]
Step 3: [specific action] → verify: [cmd output]
```

**Constraints**:
- Mỗi step ≤30 phút
- Verify ngay sau mỗi step
- Nếu fail → rollback, log reason, chọn task khác

---

## PHASE 3: EXECUTION

**Rules**:
- ALWAYS write test FIRST (red-green-refactor)
- NEVER modify unrelated code
- ALWAYS match existing style
- ALWAYS update docs nếu API changes
- ALWAYS run `make quality` sau mỗi batch

**Success definition**:
- All tests pass
- Coverage improved (if applicable) OR maintained ≥80% all metrics
- No new violations
- Quality gate score ≥90
- Improvement impact measurable (coverage delta, perf delta, security hardening)

**Failure handling**:
- Timeout/oom → autoscale or skip
- Conflict with human edit → pause, log conflict, notify (không overwrite)
- Task impossible after 3 attempts → mark "blocked", move to next

---

## PHASE 4: REPORTING & METRICS

### 7.1 Metrics Log Format

Mỗi task completion, append to `docs/AGENT_METRICS.md`:

```markdown
## [YYYY-MM-DD HH:MM] Cycle N - Task: [Task Name]
- **Type**: Violation Fix / Proactive Improvement
- **Priority**: CRITICAL/HIGH/MEDIUM/LOW
- **Duration**: X minutes
- **Status**: ✅ Success / ❌ Failed
- **Test Delta**: +Y tests (total Z)
- **Coverage Delta**:
  - Statements: +A% (B→C%)
  - Branches: +D% (E→F%)
  - Functions: +G% (H→I%)
  - Lines: +J% (K→L%)
- **Performance**: (nếu applicable)
  - p50: Xms→Yms
  - p99: Xms→Yms
  - Memory: XMB→YMB
- **Security**: [actions taken, e.g., "Added auth middleware", "Rotated secret API_KEY"]
- **Notes**: [details, root cause, refactor notes]
```

### 7.2 Auto-Update Docs

Sau mỗi task:
1. Append metrics to `docs/AGENT_METRICS.md`
2. Append weakness mới (nếu có) đến `docs/AGENT_PROFILE.md`
3. Append trajectory changes (nếu có) đến `docs/EVOLUTION.md`

---

## PHASE 5: SCHEDULING

### 8.1 Cycle Timing
- Discovery Phase: ngay khi start (no delay)
- Task Execution: nối tiếp, tối đa 3 tasks mỗi cycle
- Sleep: 5 phút nếu Task Queue rỗng
- Next Discovery: sau 2h từ start của cycle trước

### 8.2 Emergency Break

STOP execution nếu:
- Error rate >5% trong 10 phút rolling window
- Memory >90% cho >5 phút
- Disk <10%
- Dependency outage (>30m)

**Action**: rollback last batch, log, alert, wait manual.

---

## SESSION START (BẮT BUỘC)

Mỗi session mới hoặc sau khi đọc codebase mới:

1. Đọc toàn bộ repository
2. Đọc `docs/PROJECT_STATE.md` (nếu có)
3. Hiểu capabilities và failures hiện tại
4. Xác định next highest-impact task
5. Implement improvements
6. Run tests/builds với tools
7. **Run System Audit (10 dimensions from AGENTS.md Section 8)**
8. Update `PROJECT_STATE.md`
9. Update `TODO.md` với completed và follow-ups

---

## CONTINUOUS LOOP MODE

Default: continuous evolution. Sau khi complete iteration, phải identify next highest-impact TODO và tiếp tục work, ngay cả khi không có user prompt mới, UNLESS:
- User explicitly tells you to stop/pause
- Tests/builds fail và cần clarification
- **Audit fails (critical issues found)**
- Không còn actionable TODO items

---

## GIT COMMIT (MANDATORY)

**SAU KHI HOÀN THÀNH MỘT VÒNG LOOP:**

```bash
git add -A
git commit -m "chore: evolution round - <brief description>"
```

Chỉ sau git commit xong thì mới bắt đầu vòng mới.

---

## MENTAL TESTING MODE (Brief)

Xem chi tiết trong **AGENTS.md Section 6**.

- KHÔNG viết test code (sẽ verify trong đầu)
- KHÔNG check bằng tool (tưởng tượng scenarios)
- Tưởng tượng ALL inputs: valid, invalid, null, empty, boundary
- Từng nhánh logic phải cover
- Tất cả error paths phải handle
- Data flow cả 2 chiều (UI→DB, DB→UI)

---

## CODE PRESERVATION (Brief)

Xem chi tiết trong **AGENTS.md Section 4**.

- KHÔNG XÓA CODE (last resort)
- Debug: Read → Understand → Isolate → Test → Verify (systematic)
- Nếu lỗi: preserve, tìm root cause, fix logic
- Luôn có plan restore từ git
- Disable feature tạm thời thay vì xóa

---

## CHANGE COST & RISK (Brief)

Xem chi tiết trong **AGENTS.md Section 4**.

- Estimate engineering cost (hours/days)
- Risk level: Low / Medium / High
- Estimated rollback time
- Prefer Low-risk, high-impact over High-risk, aesthetic

---

## MISSING CODE = WRITE MORE (Brief)

Xem chi tiết trong **AGENTS.md Section 4**.

- Nếu phát hiện thiếu → VIẾT THÊM
- KHÔNG skip "không yêu cầu"
- KHÔNG remove code để simplify
- KHÔNG giảm scope để pass nhanh
- App ngày càng hoàn thiện

---

## SKILL INTEGRATION (Brief)

Xem chi tiết trong **AGENTS.md Section 13**.

Đọc skill file trước khi modify:

| Skill | Use Case |
|-------|----------|
| `angular-modular-architect` | Angular SPA |
| `backend-db-pattern` | Database (4 steps) |
| `code-review` | Cleanup |
| `dotnet-modular-architect` | .NET monolith |
| `erp-architect` | Fullstack ERP |
| `iam-platform-layer` | Auth/Security |
| `go-architect` | Go services |
| `react-architect` | React apps |
| `rust-architect` | Rust systems |
| `python-architect` | Python apps |

---

## SEARCH & ANALYSIS MODE (Brief)

Xem chi tiết trong **AGENTS.md Section 6**.

**[search-mode]**: MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL: explore agents, librarian agents, plus Grep/rg/ast-grep. NEVER stop at first result.

**[analyze-mode]**: ANALYSIS MODE. Gather context in parallel. IF COMPLEX → consult Oracle/Artistry. SYNTHESIZE findings.

---

## BEHAVIORAL GUIDELINES (CLAUDE) - Brief

Xem chi tiết trong **AGENTS.md Section 17**.

These guidelines bias toward caution over speed. Core principles:

1. **Think Before Coding**: Don't assume, state assumptions explicitly, ask when unclear, present multiple interpretations, push back on overcomplication.
2. **Simplicity First**: Minimum code that solves the problem. No speculative features, no single-use abstractions, no unnecessary flexibility. If 200 lines could be 50, rewrite.
3. **Surgical Changes**: Touch only what you must. Don't "improve" adjacent code, don't refactor unbroken code, match existing style. Remove only YOUR unused orphans. Pre-existing dead code → mention, don't delete.
4. **Goal-Driven Execution**: Define success criteria BEFORE implementation. Transform tasks into verifiable goals with checks. Loop until verified.

**Validation**: Works if: fewer unnecessary diff changes, fewer rewrites, clarifying questions before implementation.

---

## STRICT MODE - NO HALLUCINATION (Brief)

Xem chi tiết trong **AGENTS.md Section 6**.

**MUST NOT**: guess, infer missing behavior, invent APIs, assume inputs, assume error handling. If missing → STOP and output: "Cannot generate tests because: <exact missing information>".

---

## MENTAL TESTING PROMPT (Brief)

Xem chi tiết trong **AGENTS.md Section 6**.

**Core Principle**: Code must be safe for production after mental verification. NO actual test code written, but verify EVERY scenario in head.

Test ALL dimensions: Inputs, Outputs, Branches, Errors, DataFlow (both directions), Security, Performance, Concurrency, State, Observability.

---

## PRODUCTION TESTING PIPELINE (Brief)

Xem chi tiết trong **AGENTS.md Section 7**.

27 gates from untrusted code artifact → production release. LLM only does Step 0. All other steps exist because code lies until proven correct.

---

## SYSTEM AUDIT WORKFLOW (Brief)

Xem chi tiết trong **AGENTS.md Section 8**.

**Trigger**: Before any production deploy OR after major changes.

Audit all 10 dimensions. For each issue found, must produce: Severity, Location, Exploit, Impact, Fix, Test Case, Priority.

**Audit Pass Criteria**: Self-score ≥90 on audit checklist + zero critical issues.

If audit fails → return to `Optimize` step, do NOT proceed to `Verify`.

---

## CONTINUOUS IMPROVEMENT METRICS

Agent phải theo dõi và cố gắng cải thiện các metrics này mỗi cycle:

- **Health Score**:
  ```
  Health = (coverage% * 0.3) + ((1 - avg_complexity/20) * 0.3) + (test_count/1000 * 0.2) + ((1 - duplication%) * 0.2)
  ```
  Target: Tăng ít nhất 0.5% mỗi tuần. Nếu stagnant >3 ngày → escalate.

- **Evolution Rate**: Số improvements hoàn thành mỗi tuần. Target: ≥10.

- **Technical Debt Reduction**: TODOs/FIXMEs giảm ≥2 mỗi tuần.

- **Security Posture**: CVE patches within 24h, no secrets in code (scanned mỗi 2h), JWT RS256 enforced, rate limiting active.

- **Performance Trend**: p50/p99 giảm ≥5% mỗi iteration (khi có performance tasks). Baseline: p50<100ms, p99<200ms cho APIs.

- **Documentation Coverage**: JSDoc coverage ≥95% cho public APIs. Mỗi module mới phải có docs.

- **Observability Depth**: Mỗi service có ít nhất 5 custom metrics + tracing (OpenTelemetry) + structured logs.

Log metrics hàng tuần vào `docs/EVOLUTION.md`. Nếu bất kỳ metric nào giảm >2% → tạo urgent task.

---

## DELEGATION TO TEAM

Nếu task phức tạp (>8h ước tính), tự động:
1. Break thành sub-tasks (với team_run)
2. Gọi `team_run({ tasks: [...] })` với teamSize phù hợp
3. Monitor progress, merge results
4. Verify integration

**Breakdown Strategy**:
- Mỗi sub-task ≤4h
- Assign roles: planner, coder, reviewer, tester
- Use feature branches + PRs internally

---

## QUALITY GATE EMBEDDED (Non-negotiable)

Mọi code change phải pass:
- Functions ≤20 lines
- Complexity ≤10
- No 5+ duplicates
- Error handling 100% (all public)
- Input validation 100% (all external)
- No hardcoded secrets
- Testable (no direct DB/network in business logic)
- Coverage ≥80% (measured)
- All tests pass

If ANY fail → reject commit, auto-revert.

---

## SECURITY IMPERATIVE

- Scan cho secrets mỗi 2h: `security.scan`
- Parameterized queries CHO TẤT CẢ SQL
- No eval/crypto in production code
- KMS cho all secrets
- TLS 1.2+ cho external calls
- Auth CHO MỌI state-changing endpoint
- HttpOnly cookies, no PII logs
- JWT RS256, rate limiting, CSP
- STRIDE+DREAD threat model CHO new features

---

## PERFORMANCE BENCHMARK

Benchmark mỗi thay đổi:
- Scenario: 10k+ records, 1MB+ payload
- Baseline vs Optimization
- Assertions: p50<100ms, p99<200ms
- No O(n²), N+1, blocking I/O

---

## OBSERVABILITY AUTO-INJECT

Mỗi service/module phải có:
- Structured JSON logs
- Correlation ID (X-Request-ID)
- Metrics: http_requests_total, http_request_duration_seconds, errors_total
- Health endpoints (/health: ready, live)
- SLOs: availability 99.9%, error rate <0.1%

---

## CONCURRENCY SAFETY

Shared state analysis BUỘC:
- List shared variables
- Synchronization mechanism (mutex/lock/atomic)
- Safety proof (happens-before)
- Deadlock avoidance (lock ordering/timeouts)
- Contention analysis
- Async safety (handle all rejections)

---

## PRODUCTION CHECKLIST (Execute Before ANY Commit)

- [ ] All functions mental-tested (valid/invalid/edge/error)
- [ ] All APIs contract verified
- [ ] All flows UI→DB và DB→UI
- [ ] All edge cases covered
- [ ] All error paths handled
- [ ] Security vulnerabilities none
- [ ] Performance acceptable
- [ ] Industry standards met
- [ ] Documentation updated
- [ ] Missing code = written (not skipped)

---

## QUICK REFERENCE (Optional)

TBD: One-page summary of most-used checks and commands.

---

## LINK TO FULL AGENTS.md

Tất cả chi tiết đầy đủ xem trong **AGENTS.md** (17 sections, production-ready framework, including new BEHAVIORAL GUIDELINES).

Nội dung AUTO-CONTINUE này là **condensed workflow** cho agent autonomy. Các checklist, templates, standards đều được define trong AGENTS.md.

---

**v2.2 Enhanced**: ~300 lines (vs v2.1 150 lines). Added: Autonomous scheduling, Proactive analysis (10-point), Improvement catalog, Health Score metrics, Emergency breaks, Task delegation, Dependency management, Enhanced reporting.

**Key additions**: Continuous 2h cycles, no-standstill rule, metrics-driven evolution, automatic team delegation, emergency stop conditions.
