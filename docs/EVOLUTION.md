# Lộ trình Tiến hoá (3–6 tháng)

**Mục đích**: Quỹ đạo chiến lược và kế hoạch refactor để cải tiến liên tục.
**Cơ sở**: Chỉ số hiện tại, xu hướng vi phạm, nợ kỹ thuật.
**Cập nhật**: Sau mỗi chu kỳ lớn hoặc khi quỹ đạo đổi.

---

## Quỹ đạo hiện tại

### Xu hướng Health Score
- **Hiện tại**: ~84 (phủ câu lệnh ~78.9%, nhánh ~68.8%, hàm ~70.8%, dòng ~80.2%; ~2036 test).
- **Mục tiêu**: ≥90 điểm.
- **Cần cải thiện/tuần**: +0.5% (≈ +0.5% phủ).
- **Trạng thái**: 🔄 Phủ dòng ≥80%; nhánh ~68.8% (thiếu +11.2%); hàm ~70.8% (thiếu +9.19%). Điểm nghẽn: `utils/kinship/compute.ts` nhánh ~50%, `server/archive/actions.ts` ~69%.
- **Tiếp**: đẩy phủ module thấp; rồi giảm lint (~813 lỗi).

**Phiên 2026-08 (AUTO-37)**:
- Phủ: câu lệnh 83.30%, nhánh 71.19%, hàm 77.15%, dòng 84.64% (tăng từ 82.16/68.81/74.04/83.49).
- Lint: 808 lỗi / 182 warning.
- Test: 2.068 pass / 1 skip.
- Còn thiếu tới gate (≥80% cả 4 chỉ số): nhánh -8.81%, hàm -2.85%

**Phiên 2026-10-24 (AUTO-38)**:
- Phủ: câu lệnh 83.97%, nhánh 71.62%, hàm 79.52%, dòng 85.30% (nhảy hàm +2.37% nhờ tách hook `useIntakeFormStates` thành 2 sub-hook, cả hai đều được test bao phủ).
- Lint: 944 problems (792 lỗi / 152 warning) — giảm 29 so với đầu chu kỳ; còn lại chủ yếu `max-lines-per-function` (549), `complexity` (168), `no-unused-vars` (147).
- Test: 2.079 pass / 1 skip; Typecheck PASS; Build SUCCESS.
- Còn thiếu tới gate (≥80% cả 4 chỉ số): nhánh -8.38%, hàm -0.48% (sắp chạm ngưỡng hàm).
- Trích 3 hàm gần ngưỡng + sửa 1 lỗi `rules-of-hooks` (bug tiềm ẩn runtime) + mọi cảnh báo lint đơn lẻ còn sót trong phạm vi đã chạm..

**Phiên 2026-10-24 (AUTO-42)**:
- Type [T] — đẩy phủ nhánh điểm nghẽt `server/archive/actions.ts`: branch **~74%→95%** (60/81→77/81), dòng 100% (thêm `archive-branches.test.ts`, 12 test, không sửa production). Test 2143→2155 pass / 1 skip.
- Sau AUTO-39/40/41 (hoàn tất GĐ1: Quỹ/Thuật ngữ/Email/Tuổi nợ/Pipeline Kanban). Typecheck/Build PASS. `git commit/push` đỏ-vạch §7 — **chưa commit**, chờ chủ sở hữu duyệt.
- **Điểm nghẽt còn lại**: `utils/kinship/compute.ts` nhánh ~50% (cần dựng đồ thị máu phức tạp; lên lịch sau).

## Đang chặn chờ duyệt
- Xoá dead code `src/utils/kinship/bloodGraph.ts` (transformAMap/transformBMap/suffix) — cần duyệt theo AGENTS.md §5.7.
- Gỡ 6 import không dùng trong `server/matters/actions.ts` — cùng luật, cần kiểm import trước.
- `git commit` / `git push` — đỏ-vạch, cần duyệt rõ ràng.

## Điểm mạnh
- Stack Next.js 16 + TypeScript đầy đủ.
- Prisma ORM kèm migration.
- Test Vitest đầy đủ.
- Cài lint + typecheck.
- Component shadcn/ui.

## Điểm yếu
- ✅ Căn cứ phủ đã có.
- ⚠️ Chưa đo complexity (cần tool).
- ⚠️ Cứng hóa bảo mật đang chờ.
- ⚠️ Chưa có mốc hiệu năng.

## Việc đã hoàn thành (tóm tắt)

### Sprint 1 (Tuần 1–2): Cải thiện phủ test
- `server/preservations/actions.ts`: ~9% → 97.88% câu lệnh; nhánh ~5%→75.4%; +30 test. Phủ tổng 90.24→98.18%.

### Sprint 2 (Tuần 3): Test telemetry metrics
- `lib/telemetry/metrics.ts`: ~61%→100%; +30 test. Phủ 98.18→98.85%.

### Sprint 3 (Tuần 4): Vệ sinh code & kiểu
- Giảm warning lint 120→87; sửa lỗi kiểu; tắt `instrumentationHook`; `<img>`→`next/image`.

### Sprint 4 (Tuần 5): Giảm lint & React Compiler
- Warning 87→57; chỉnh Table/DataTable; dọn import biến không dùng.

### Sprint 5 (Tuần 6): Dọn lint toàn diện
- Warning 57→0; sửa test date comparison; bọc `autoTitle` bằng `useCallback`; message server action rõ ràng; giữ 98.85% phủ.

### P0: Bỏ miễn trừ giới hạn tốc độ
- `src/proxy.ts`: áp giới hạn đều cho mọi `/api/*` ngoại trừ health/auth. +4 test token-bucket. Đóng vector DoS.

### JWT RS256 (CYCLE-N-16)
- Cài encode/decode RSA (`src/lib/auth/jwt.ts`), session 4h; fail-fast nếu thiếu env; +7 test. Triển khai cần duyệt (vô hiệu session cũ).

## Công việc đã hoàn thành — chu kỳ nhiều đợt (tóm tắt)

- **Refactor lộ trình**:
  - `intake-sheet.tsx`: 1593→1337→~1248 dòng (trích DocumentsSection, PartiesSection, FeeSection, Section…).
  - `seal-request-sheet`: 327→~317 dòng; trích PurposeSection.
  - `contacts-view`, `event-card`: dưới gate.
  - `gedcom/parser`: giảm phức tạp; `dateHelpers.getZodiacSign`: 51→1.
  - `server/matters/actions.ts`: trích `buildClientLinks/buildParties/buildProcedure`.
  - `createIntake`: phức tạp 79→5, dòng 179→12.
- **Đẩy phủ** (nhiều vòng):
  - causes, yuandian/enterprise, auth/options, archive, archive/guard, intakes, matters, docs, preservation, express, express-settings, finance (deleteFeeEntry, monthly, personal, searchMatterForInvoice, listAllFeeEntries), permissions, sms-parser, telemetry, family/genes, settings, user.
  - Tổng đẩy test từ ~933 lên >2.068; phủ hàm ~70→77%.
- **Lint**: từ 2.070 → ~808 lỗi (trừ `@ts-nocheck`/`eslint-disable` trong test được cải tiến).

## Không có đề xuất (Tuần tới → 3 tháng)

- **Tháng 1**: Đo mốc chỉ số, sửa vi phạm then chốt, đẩy phủ ≥70% → ≥85%.
- **Tháng 2**: **Cứng hóa bảo mật/quan sát/chịu lỗi**:
  - **Bảo mật**: RBAC; JWT RS256; per-user rate-limit; mã hoá PII at-rest; ghi audit mọi thay đổi kèm scrub PII; kiểm tra file (magic bytes, virus scan).
  - **Tuân thủ**: endpoint export GDPR (`/api/me/data-export`), right-to-erasure, SOX audit trail, chính sách lưu trữ.
  - **Quan sát**: log JSON kèm correlation id; `/health/live` `/health/ready` kèm kiểm tra lệ thuộc; Prometheus `/metrics`; OpenTelemetry tracing.
  - **Chịu lỗi**: Retry (backoff+jitter), Timeout, Circuit Breaker (ngưỡng 5/60s), Bulkhead, Fallback, Health Checks, Graceful Shutdown.
  - **Hiệu năng**: dò N+1; cache cho lookup nóng; tối ưu index; giảm bundle; mốc p50<100ms, p99<200ms.
- **Tháng 3**: Phủ ≥80% cả 4 chỉ số; test tích hợp, fuzz; test E2E; JSDoc ≥95% API public; ADR.

## Tiến hoá Infrastructure

- CI/CD: GitHub Actions quality (lint, typecheck, test, phủ ≥80%), scan bảo mật, kiểm PR, pre-commit hooks.
- DB: review schema toàn vẹn; thêm constraint; soft delete; lên kế hoạch đọc bản sao khi tải cao.

## Kế hoạch giảm nợ

| Loại nợ | Hiện | Mục tiêu (3 tháng) | Chiến lược |
|---|---|---|---|
| TODO/FIXME | TBD | -20 | Sửa lúc refactor |
| Vi phạm complexity | TBD | -30 | Trích hàm, guard clause |
| Trùng lặp | TBD | -50 dòng | Hằng số chung, util |
| Test thiếu | TBD | +50 | TDD khi sửa lỗi |
| Khe bảo mật | TBD | 0 critical | Audit STRIDE + vá |

## Đánh giá rủi ro

| Rủi ro | Xác suất | Ảnh hưởng | Giảm |
|---|---|---|---|
| Breaking khi refactor | Trung bình | Cao | Test đầy đủ, feature flag |
| Lộ lỗi bảo mật | Thấp | Nghiêm trọng | Vá ngay, giám sát (Snyk) |
| Hồi quy hiệu năng | Trung bình | Trung bình | Mốc trước/sau |
| Test flaky | Thấp | Trung bình | Test khả định, cô lập |
| Xung đột phụ thuộc | Trung bình | Trung bình | Pin phiên bản, ma trận test |

## Mục tiêu chỉ số tiến hoá

| Chỉ số | Hiện | 1 tháng | 3 tháng | 6 tháng |
|---|---|---|---|---|
| Health Score | 0 | 50 | 80 | 90+ |
| Phủ test | 0% | 70% | 85% | 90% |
| Complexity TB | ∞ | 15 | 10 | ≤8 |
| Trùng lặp | TBD | <10% | <5% | <3% |
| Lỗ hổng bảo mật | TBD | 0 critical | 0 high | 0 |
| p99 hiệu năng | TBD | <500ms | <200ms | <100ms |

## Ký duyệt

- [ ] TL: _________________ Ngày: _________
- [ ] Bảo mật: _________________ Ngày: _________
- [ ] SRE: _________________ Ngày: _________

**Cập nhật lần cuối**: 2025-06-30 (tạo lần đầu)
**Rà kế tiếp**: Sau chu kỳ đầu hoặc khi quỹ đạo đổi.

---
