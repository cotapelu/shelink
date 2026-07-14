# AUTO-CONTINUE.md vs AGENTS.md - Comparison Report

**Ngày**: 2025-06-30  
**Phiên bản**: AUTO-CONTINUE v2.2 vs AGENTS.md v2.1  
**Mục đích**: Phân tích xung đột và đề xuất triển khai an toàn

---

## 1. TỔNG QUAN

| Khía cạnh | AGENTS.md (hiện tại) | AUTO-CONTINUE.md (proposed) | Đánh giá |
|-----------|---------------------|-----------------------------|----------|
| **Workflow** | Manual, theo yêu cầu | Autonomous, continuous loop | ⚠️ Có thể thêm nhưng cần approval |
| **Autonomy Level** | Human-in-the-loop | Full autonomy (modify, commit, push) | ❌ XUNG ĐỘT |
| **Git Operations** | Chỉ thủ công,需 approval | Auto-commit, auto-revert | ❌ XUNG ĐỘT |
| **Code Modification** | Manual only | Auto-fix violations | ❌ XUNG ĐỘT |
| **Discovery Cycle** | Không có | Mỗi 2h (auto) | ✅ Có thể thêm (read-only) |
| **Metrics Tracking** | Không có | AGENT_METRICS.md, AGENT_PROFILE.md, EVOLUTION.md | ✅ Có thể thêm |
| **Quality Gates** | Có (từng phần) | ≥90 points (structured) | ✅ Compatible |
| **Audit** | Có (10 dimensions) | Có (bắt buộc trước verify) | ✅ Compatible |

---

## 2. XUNG ĐỘT NGHIÊM TRỌNG (Cần sửa AGENTS.md)

### 2.1 Đường đỏ (AGENTS.md mục 7)

**AGENTS.md nói:**
> "Liên quan đường đỏ (xóa file, sửa `.env`/CI, `git push`/`reset`/`rebase`, triển khai sản xuất, migration Schema) **phải** xin đồng ý của Yến trước."

**AUTO-CONTINUE.md yêu cầu:**
- ✅ **Auto-modify code** ( không qua review)
- ✅ **Auto-commit** (self-approved)
- ✅ **Auto-revert** (trong emergency)
- ✅ **Auto-push** (nếu được cấu hình)

**Kết luận**: ❌ **XUNG ĐỘT TRỌNG TAM** - AUTO-CONTINUE vi phạm trực tiếp "đường đỏ" của AGENTS.md.

**Giải pháp**:
1. Sửa AGENTS.md mục 7 để thêm: "Autonomous agent (được phê duyệt) được phép auto-commit và auto-revert với các điều kiện: ..."
2. Hoặc: Giới hạn AUTO-CONTINUE chỉ chạy ở chế độ **discovery-only** (không modify code, không commit).

---

### 2.2 Git Operations

| Operation | AGENTS.md | AUTO-CONTINUE.md | Conflict |
|-----------|-----------|------------------|----------|
| `git commit` | Chỉ thủ công | Auto sau mỗi cycle | ❌ |
| `git revert` | Chỉ Yến | Auto trong emergency | ❌ |
| `git push` |需 approval | Có thể auto | ❌ |
| `git reset/rebase` |需 approval | Không đề cập (nhưng có thể) | ⚠️ |

**Risk**: Auto-commit có thể đưa code chưa review vào main branch.

---

### 2.3 Code Modification Authority

**AGENTS.md**: Code changes phải qua:
1. Sửa tài liệu trước
2. Chạy quality commands
3. Xác nhận site cục bộ
4. Giao hàng thủ công

**AUTO-CONTINUE**: "Auto-fix violations" tự động, không có human review.

**Risk**: Bug từ auto-fix có thể gây production issue.

---

## 3. XUNG ĐỘT NHẸ (Có thể giải quyết)

### 3.1 Continuous Loop vs Manual Trigger

- **AGENTS.md**: Agent hoạt động theo yêu cầu cụ thể
- **AUTO-CONTINUE**: Chạy liên tục 24/7 (continuous daemon)

**Giải pháp**: Thêm option trong AGENTS.md cho phép chọn mode (manual vs autonomous).

---

### 3.2 Metrics Files

- **AGENTS.md**: Không có yêu cầu metrics tracking
- **AUTO-CONTINUE**: Yêu cầu 3 files: AGENT_METRICS.md, AGENT_PROFILE.md, EVOLUTION.md

**Đây là addition**, không xung đột. Có thể thêm vào AGENTS.md như là optional.

---

### 3.3 Quality Gate Thresholds

- **AGENTS.md**: Yêu cầu chất lượng nhưng không có điểm cụ thể
- **AUTO-CONTINUE**: ≥90/100 points (structured)

**Đây là improvement**, có thể integrate.

---

## 4. DANH SÁCH CẦN SỬA AGENTS.md

Để triển khai AUTO-CONTINUE một cách an toàn, **bắt buộc** sửa AGENTS.md:

### 4.1 Mục 7 (Đường đỏ) - Thêm exceptions:
```markdown
### 7. Lệnh xác thực (chạy mỗi lần sửa xong)

[Giữ nguyên...]

**Đường đỏ (cần approval từ Yến)**:
- Xóa file
- Sửa `.env`/CI
- `git push`/`reset`/`rebase`
- Triển khai sản xuất
- Migration Schema
- **Autonomous agent operations** (auto-commit, auto-revert, auto-push) - CHỈ ĐƯỢC PHÉP với:
  - [ ] Discovery-only mode (read-only, no code modification)
  - [ ] Limited auto-fix mode (documentation-only, tests-only)
  - [ ] Full-auto mode (có written approval và safety guardrails)
```

### 4.2 Thêm mục mới: "Autonomous Agent Framework"

```markdown
### 11. Autonomous Agent (PROPOSED)

**Autonomy Levels**:
1. **Discovery-Only**: Read-only scan, generate reports, NO code modification, NO git operations
2. **Limited Auto-Fix**: Can modify code but PR required, NO auto-commit
3. **Full Auto**: Can modify, commit, revert (requires written approval + emergency rollback plan)

**Required Files**:
- `docs/AGENT_METRICS.md` - Metrics tracking
- `docs/AGENT_PROFILE.md` - Weakness profile
- `docs/EVOLUTION.md` - Roadmap
- `docs/AUTO-CONTINUE.md` - Workflow definition

**Safety Guardrails** (phải có trong bất kỳ mode nào):
- [ ] Memory threshold (e.g., 90%)
- [ ] Error rate threshold (e.g., 5%)
- [ ] Batch size limit (max 3 tasks/cycle)
- [ ] Human review checkpoint (sau mỗi 10 tasks)
- [ ] Emergency stop button
- [ ] Rollback capability (git revert)

**Approval Workflow**:
1. Submit AUTO-CONTINUE.md proposal
2. Review với Yến
3. Define scope và safety guardrails
4. Pilot 2 tuần (discovery-only)
5. Review metrics → decide next phase
```

---

### 4.3 Cập nhật mục 1 (Mission)

Thêm: "Có thể sử dụng autonomous agent nếu được phê duyệt theo mục 11."

---

## 5. RISKS NẾU TRIỂN KHAI KHÔNG CẨN THẬN

| Risk | Mức độ | Impact | giải quyết |
|------|--------|--------|-----------|
| Auto-commit bug code | Cao | Production outage | Discovery-only first |
| Auto-revert loses work | Trung bình | Code loss | Human review batch |
| Continuous daemon resource | Thấp | Memory/CPU |batch size limit |
| Conflict với human edit | Trung bình | Merge conflict | Pause on conflict |
| Security flaw auto-fix | Cao | Data breach | Audit trước verify |

---

## 6. DEADLOCK BETWEEN AGENTS.md và AUTO-CONTINUE.md

Hiện tại, **AUTO-CONTINUE.md yêu cầu**:

1. **"Git commit mandatory"** → vi phạm AGENTS.md mục 7 (cần approval)
2. **"Auto-modify code"** → vi phạm AGENTS.md mục 5 (sửa tài liệu trước, xác nhận thủ công)
3. **"Continuous loop"** → không có trong AGENTS.md

Để giải quyết, **phải sửa AGENTS.md trước** hoặc chỉ chạy AUTO-CONTINUE ở chế độ discovery-only.

---

## 7. RECOMMENDATIONS

### **Option 1: Safe Pilot (KHÔNG CẦN SỬA AGENTS.md)**
- Chỉ chạy **discovery-only mode**
- Không modify code
- Không commit
- Chỉ generate reports
- **Không cần sửa AGENTS.md**

### **Option 2: Full Deployment (CẦN SỬA AGENTS.md)**
- Sửa AGENTS.md mục 7 để cho phép autonomous operations với conditions
- Thêm mục 11 (Autonomous Agent Framework)
- Define safety guardrails
- Get written approval từ Yến

### **Option 3: Hybrid Approach**
- Phase 1: Discovery-only (no code change)
- Phase 2: Limited auto-fix (PR required, human review)
- Phase 3: Full auto (sau khi trust established)

---

## 8. NEXT STEPS

1. ✅ **Sửa AGENTS.md** (nếu chọn Option 2/3)
2. ✅ **Lấy approval từ Yến** (written)
3. ✅ **Setup safety guardrails** (emergency stop, rollback)
4. ✅ **Chạy discovery-only pilot** (2 tuần)
5. ✅ **Review metrics** và quyết định Phase 2

---

**Kết luận**: AUTO-CONTINUE.md là framework mạnh nhưng **xung đột với AGENTS.md hiện tại**. Có 2 con đường:
1. **Discovery-only** (an toàn, không cần sửa AGENTS.md)
2. **Sửa AGENTS.md** để hợp pháp hóa autonomous operations (cần approval nghiêm ngặt)

**Không nên triển khai full-auto ngay** vì risk quá cao.

---

**Tài liệu liên quan**:
- `docs/AUTONOMOUS_AGENT_PILOT_PROPOSAL.md` (Pilot proposal chi tiết)
- `AGENTS.md` (Workflow hiện tại)
- `AUTO-CONTINUE.md` (Framework đề xuất)
