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

**Phiên 2026-10-31 (AUTO-53)**:
- Phục hồi môi trường chạy: `npm ci` + approve 7 install scripts (Prisma engines/esbuild), tạo `.env` đủ biến (DATABASE_URL, NEXTAUTH_SECRET=public key PEM cho RS256, JWT PKCS#8/SPKI, STORAGE_ENCRYPTION_KEY), `prisma generate`, migrate status 45/45 khớp DB `shelink`. Dev :3000 chạy.
- Sửa 3 lỗi chặn chạy: key PEM sai format (PKCS#1/ssh-rsa → PKCS#8/SPKI), `NO_SECRET` của next-auth v4 `withAuth` không decode được RS256-JWS (viết lại `src/proxy.ts` kiểm session bằng `getServerSession`, giữ RS256 theo GOAL), `/matters` 500 do `useFormContext` null ngoài `FormProvider` (root-cause: hook nhận props control/setValue).
- TD-D4 `/org-chart` (chỉ đọc, Team/TeamMember, không migration) + xác thực DB thật bằng data demo rồi dọn sạch.
- Test: 2233 pass / 1 skip / 0 fail. Lint: 940 (788 lỗi) — giảm 2. Typecheck PASS.
- Còn lại GĐ2 (không migration): TD-H3 trung tâm trợ giúp, TD-B2/B6 (một phần), God-object refactor (`intake-sheet.tsx` ~1570 dòng, `procedure-content.tsx`). Cần migration (xin duyệt): TD-B2 budget, TD-D1/D5/D6, TD-G3 2FA.

**Phiên 2026-10-31 (AUTO-55)**:
- [R] Tách God-hook `useArchiveWizard` (135 dòng) → prep/upload/helpers + submit tách khỏi hook; API giữ nguyên; +17 test. Lint 940→939.
- Phát hiện `folders-panel.tsx` là **code chết** (không ai import, đã bị documents-panel thay thế) — chờ chủ sở hữn quyết định xóa/khôi phục.
- Bẫy ghi nhận: khi tách hook có effect, callback nạp dữ liệu phải tạo MỘT lần (useCallback) rồi truyền cho cả effect — tạo 2 identity → effect loop vô tạn.

**Phiên 2026-10-31 (AUTO-56)**:
- [R/T] `RelationshipManager.tsx` (1041 dòng God Object): trích lib thuần `relationship-manager-lib.ts` + rewire component (fetch 77→20 dòng); gỡ 2 interface trùng lặp; +21 test.
- [HIGH] `/genealogy` 500: `getPersons` thiếu `createdAt/updatedAt` trong select (mapper `.toISOString()`) → trích `PERSON_LIST_SELECT` + 3 regression test. 3 trang genealogy 200.
- Test: 2274 pass / 1 skip / 0 fail. Lint: 939→936 (787→784 lỗi).

**Phiên 2026-10-31 (AUTO-57)**:
- [R/T] `lib/template-builder.ts`: 9 lỗi lint → 0 (tách XML parts + 8 body thành hằng; 2 mẫu có ngày dùng `injectSignDate` thuần giữ đúng thời điểm ký); +9 test; byte-equivalence 8/8 mẫu.
- Test: 2283 pass. Lint: 936→927 (784→775 lỗi). Nợ Quality còn: server (finance/actions 16, seals 16, matters/export-xlsx 13, preservations/actions-v2 12, documents/actions 11) + UI god objects (intake-sheet ~1570, procedure-content 1357, RelationshipManager 3 arrow JSX).

**Phiên 2026-10-31 (AUTO-58)**:
- [R/T] `createFeeEntry`: tách payload thuần sang `fee-entry-lib.ts` (+12 test); arrow transaction 55→29 dòng, mất lỗi complexity 14.
- Test: 2295 pass / 1 skip / 0 fail. Lint: 927→926 (775→774 lỗi).
- Tiếp theo (AUTO-59): `createInvoiceRequest` cx 48 → tách validate/allocation; `getMatterInvoiceContext` cx 18; rồi tách `finance/actions.ts` (>300 dòng) thành module.

**Phiên 2026-10-31 (AUTO-59)**:
- [R/T] `createInvoiceRequest` (cx 48 → 0 trong action): tách `invoice-request-lib.ts` (violation table-driven, payload, notification content); +18 test; message/thứ tự giữ y nguyên.
- Test: 2313 pass / 1 skip / 0 fail. Lint: 926→925 (774→773 lỗi).

**Phiên 2026-10-31 (AUTO-60)**:
- [R/T] `getMatterInvoiceContext` (cx 18, 77 dòng): tách `invoice-context-lib.ts` (buildClientOptions/buildInvoiceContext) + `MATTER_INVOICE_SELECT`; action 77→10 dòng; +12 test.
- Test: 2325 pass / 1 skip / 0 fail. Lint: 925→923 (773→771 lỗi). `finance/actions.ts`: 16→12 lỗi, 4 lib finance 0 lỗi.

**Phiên 2026-10-31 (AUTO-61)**:
- [R/T] `finance-stats-lib.ts` mới: computeMatterFinanceStats/buckets/revenue windows; rewire 3 action thống kê; +13 test.
- Test: 2338 pass / 1 skip / 0 fail. Lint: 923→921 (771→769 lỗi). `finance/actions.ts`: 16→10 lỗi; 5/5 lib finance 0 lỗi.

**Phiên 2026-10-31 (AUTO-62)**:
- [R] `finance/actions.ts`: 10 lỗi → 1 (còn file>300). Tách 7 hàm: run*/createCommissionChildren/toBillingCreateData/INVOICE_REQUEST_LIST_SELECT/findMatterLabel/queries.ts (fetchMatterFinanceData).
- Test: 2338 pass / 1 skip / 0 fail. Lint: 921→912 (769→760 lỗi).
- Chu kỳ minh họa rõ đạo lý: **edit atomic** — verify file sau mỗi edit báo lỗi trước khi làm tiếp.

**Phiên 2026-10-31 (AUTO-63) — BLOCKED**:
- [R] Tách finance/actions.ts (440 dòng) → bị chặn bởi ràng buộc Next.js: `"use server"` không cho re-export named → /finance 500 tại runtime. Đã revert sạch, gate giữ nguyên (912/760/152).
- Kế hoạch AUTO-64 (đúng cách): consumer import trực tiếp từ module mới (5 component + 9 test file), KHÔNG re-export.

**Phiên 2026-10-31 (AUTO-64)**:
- [R] Tách `finance/actions.ts` (558 dòng) → `billing-actions.ts` (240 dòng) + `actions.ts` (331 dòng, 0 lỗi lint). Consumer import trực tiếp (3 file).
- Test: 2338 pass / 1 skip / 0 fail. Lint: 912→911 (760→759 lỗi).
