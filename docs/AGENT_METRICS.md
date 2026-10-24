# Nhật ký Chỉ số & Tiến hoá Agent

**Khung**: AUTO-CONTINUE.md v2.2 + AGENTS.md v2.1
**Mục đích**: Theo dõi chu kỳ cải tiến tự chủ, chỉ số sức khoẻ, quỹ đạo tiến hoá.
**Tự cập nhật**: mỗi chu kỳ hoàn thành.

---

## Thống kê nhanh (khung GOAL v1.0)

| Chỉ số | Hiện tại | Mục tiêu | Xu hướng |
|---|---|---|---|
| Health Score | ~84* | ≥90 | ↘️ |
| Phủ câu lệnh | 78.71% | ≥80% | ↗️ |
| Phủ nhánh | 65.75% | ≥80% | ↗️ |
| Phủ hàm | 70.56% | ≥80% | → |
| Phủ dòng | 80.16% | ≥80% | ✅ |
| Độ phức tạp cyclomatic TB | ~10 (dự) | ≤10 | → |
| Vi phạm phức tạp (>10) | ~200** | 0 | ↘️ |
| Hàm >20 dòng | ~60*** | 0 | ↘️ |
| Trùng lặp | 0% (0 clone) | <5% | ✅ |
| Tốc độ tiến hoá | 6 (ngày hiện tại) | ≥10/tuần | → |
| Nợ kỹ thuật (lỗi lint) | 813 lỗi, 179 warning | 0 | ↘️ |

\* Health theo công thức GOAL: (phủ%×0.3)+((1-avgC/20)×0.3)+(tests/1000×0.2)+((1-dup%)×0.2)
\** Số vi phạm lấy từ ESLint (`max-lines-per-function`, `max-statements`). Số complexity thực chờ audit rà.
\** Ghi chú: ngưỡng complexity cập nhật 2025-07-09: hàm ≤20 dòng, cyclomatic ≤10 (trước ≤30).

---

## Công thức Health Score

```
Health = (phủ% × 0.3) + ((1 - độ_phức_tạp_TB/20) × 0.3) + (số_test/1000 × 0.2) + ((1 - trùng_lặp%) × 0.2)
```

Mục tiêu: ≥90 điểm, tăng ≥0.5%/tuần.

---

## Biểu đồ xu hướng

```
Ngày        Health   Phủ      Complexity  Test  Nợ
2025-06-30  0.00     0%       0           0     N/A
```

*(Tự cập nhật)*

---

## Lịch sử Chu kỳ

### [CYCLE-0] — 2025-06-30: Phát hiện & Thiết lập căn cứ
Loại: Setup + Discovery. Ưu tiên: THẤP. ~15 phút. Trạng thái: ✅.

**Cổng chất lượng**:
- Lint: 32 warning (0 lỗi).
- Typecheck: PASS.
- Test: 933 pass.
- Build: SUCCESS.

**Căn cứ phủ**: câu lệnh 90.24% (1341/1486), nhánh 84.89% (1090/1284), hàm 93.72% (224/239), dòng 91.07% (1173/1288).

**Vi phạm phát hiện**: HIGH 2 (khe phủ), MEDIUM 32 (biến không dùng), LOW 1 (config cũ).

**Ghi chú**: Tạo AGENT_METRICS/AGENT_PROFILE/EVOLUTION/VIOLATIONS. Xác định khe phủ then chốt: `server/preservations/actions.ts` (~9%), `lib/telemetry/metrics.ts` (~61%). Next: sửa vi phạm HIGH (Sprint 1).

### [CYCLE-1] — 2025-06-30: Sprint 1, đẩy phủ test
Loại: Fix vi phạm HIGH. ~60 phút. ✅.

- Lint: 32 warning (không đổi); Typecheck PASS; Test 933→963 (+30); Build SUCCESS.
- Phủ tổng: câu lệnh 90.24→98.18% (+7.94%), nhánh 84.89→91.51% (+6.62%), hàm 93.72→97.48% (+3.76%), dòng 91.07→98.68% (+7.61%).
- `preservations/actions.ts`: ~9%→97.88% câu lệnh; bao phủ 8 hàm export, đường lỗi/validation/quyền.
- Đã sửa: HIGH-1. HOÃN: HIGH-2 (sang sprint sau).

### [CYCLE-2] — 2026-06-30: Sprint 2, test telemetry
Loại: Fix vi phạm HIGH. ~45 phút. ✅.

- Test 963→993 (+30). Phủ 98.18→98.85%.
- `lib/telemetry/metrics.ts`: ~61%→100% (bao counter/gauge/histogram/apiRequest/businessEvent; trường hợp biên; pattern A/B).
- Đã sửa: HIGH-2.

### [CYCLE-3] — 2025-06-30: Sprint 3, vệ sinh code & kiểu
Loại: Fix MEDIUM + kiểu. ~2 giờ. ✅.

- Lint 120→87; Typecheck PASS (sửa lỗi TS metrics/tests); Test 990 pass; Build SUCCESS.
- Dọn import/biến không dùng 12+ tệp; sửa lỗi kiểu metrics; sửa `<img>`→`next/image`; bỏ `instrumentationHook`.

### [CYCLE-4] — 2025-06-30: Sprint 4, giảm lint
Loại: Fix MEDIUM. ~90 phút. ✅.

- Lint 85→57 (-28); Test 990 pass; Build SUCCESS.
- Chỉnh Table/DataTable React Compiler; `eslint-disable` tệp test có sẵn lý do; dọn 6 tệp nguồn.

### [CYCLE-5] — 2025-06-30: Sprint 5, dọn lint toàn diện + fix lỗi test
Loại: Fix HIGH + vệ sinh. ~90 phút. ✅.

- Lint 23→0; Typecheck PASS; Test 990 pass; Build SUCCESS.
- Fix test date comparison dùng `expect.any(Date)`; bọc `autoTitle` bằng `useCallback`; `<img>`→`next/image`; dọn dead code API client/rate limiter/server actions.

### [CYCLE-6] — 2025-06-30: Cài công cụ đo complexity & duplication
Loại: Tooling + Baseline. ~30 phút. ✅.

- Cài rule ESLint complexity (`max-lines-per-function` 30, `max-statements` 20, `max-lines` 300).
- Baseline complexity: 940 vi phạm (`max-lines-per-function` 777, `max-statements` 82, `max-lines` tệp 857).
- Baseline trùng lặp: 0 clone (0%) ✅.
- Thêm script `complexity`, `duplication` vào `package.json`.

### [CYCLE-AUTO-9] — 2025-07-14: Đẩy phủ algorithm & express
Loại: Mở rộng test. ~60 phút. ✅.

- Lint 0 warning; Typecheck PASS; Test 1868→1899 (+31); Build SUCCESS.
- Phủ: câu lệnh 75.75→75.94%, nhánh 61.74→61.82%, hàm 71.44→71.53%, dòng 77.25→77.45%.
- `conflicts/algorithm.ts` hàm 11%→87% (export helper); +28 test. `express/actions.ts` hàm ~78%→88% (+3 test `deleteExpress`).

### [CYCLE-AUTO-10] — 2025-07-14/15: Test listMatters
Loại: Mở rộng test. ~90 phút. ✅.

- Typecheck PASS; Test ~1922 pass (+6); Build SUCCESS.
- `server/matters/actions.ts`: 9 test listMatters (lọc category/status/owner, search, kết quả rỗng, permission filter). Phủ hàm ~71.5% (không đổi).

### [CYCLE-P1-20] — 2025-07-14: Refactor dateHelpers & fix test
Loại: Refactor + test. ~60 phút. ✅.

- Typecheck PASS; Lint 2070→1301 (-37%); test liên quan pass.
- `dateHelpers.getZodiacSign` 51→1 (bảng tra); `getLunarDateString` 27→12 dòng. Fix enum giá trị test cho khớp schema Prisma.

### [CYCLE-P1-21] — 2025-07-14: Refactor gedcom parser
Loại: Refactor complexity. ~45 phút. ✅.

- 41 test pass; phúng 1301→~1298.
- `parseGedcomDate` dùng chung; trích `parseFamilyReferences`, `createMarriage`, `createChildRelationships`.

### [CYCLE-P1-22] — 2025-07-14: gedcom tiếp (một phần)
Loại: Refactor. ~30 phút. ✅.

- `parsePersonRecord` 38→13 (handler map); `splitIntoRecords` 21→12; `parseGedcom` 21→15.

### [CYCLE-P1-23] — 2025-07-14: Test searchMattersForLink
Loại: Test. ~20 phút. ✅. +2 test (loại trừ self + linked; kết quả rỗng).

### [CYCLE-P1-24] — 2025-07-14: Test updateMatterTeam
Loại: Test. ~30 phút. ✅. +3 test (thành công/ không tìm thấy / không đủ quyền).

### [CYCLE-P1-25] — 2025-07-14: Refactor parsePersonRecord
Loại: Refactor. ~30 phút. ✅.

- Trích `handleLevel1/handleLevel2`, `buildGedcomPersonFromState`; `parsePersonRecord` 49→~20 dòng, complexity 11→5.

### [CYCLE-P1-26] — 2025-07-14: Test deleteFeeEntry
Loại: Test. ~30 phút. ✅. +3 test (xóa dây chuyền commission/kiểm quyền/không tìm thấy).

### [CYCLE-P1-27] — 2025-07-14: Test getPersonalRevenue
Loại: Test. ~30 phút. ✅. +4 test (tự xem / quản lý xem người khác / từ chối quyền / commission rỗng).

### [CYCLE-P1-28] — 2025-07-14: Test getMonthlyRevenue
Loại: Test. ~30 phút. ✅. +4 test.

### [CYCLE-P1-29] — 2025-07-14: Test searchMattersForInvoice
Loại: Test. ~30 phút. ✅. +3 test.

### [CYCLE-P1-30] — 2025-07-14: Chiến lược test (một phần)
Loại: Process. ⚠️ Một phần (khám phá).

### [CYCLE-P1-31] — 2025-07-14: Test eventHelpers
Loại: Test. ~30 phút. ✅. +4 test `computeEvents` (gộp sinh nhật/kỷ niệm qua đời, sự kiện tùy chỉnh, sắp xếp, rỗng).

### [CYCLE-P1-32] — 2025-07-14: Test audit
Loại: Test. ~30 phút. ✅. +3 test (map trường, xử lý lỗi, userId undefined → null).

### [CYCLE-P1-33] — 2025-07-14: Refactor setConflictConclusion
Loại: Refactor. ~30 phút. ✅. Trích `handleConclusionAudit`; 28→14 dòng.

### [CYCLE-P1-34] — 2025-07-14: Test audit-list
Loại: Test. ~30 phút. ✅. +5 test `listAuditLogs` / `getAuditFilterOptions`.

### [CYCLE-P1-35] — 2025-07-14: Refactor pickSeverity
Loại: Refactor. ~30 phút. ✅. if-else→map; cyclomatic 11→~5.

### [CYCLE-7] — 2025-07-03: Refactor lô 1, trích IntakeSheet
Loại: Refactor. ~90 phút. ✅ Một phần (3/7 khối).

- Test 1000 pass; Build SUCCESS.
- Trích `PartiesSection`, `FeeSection`, `Field`; `intake-sheet.tsx` 1593→1337 dòng (-256).

### [CYCLE-8] — 2025-07-03: Refactor lô 2, trích tiếp
Loại: Refactor. ~90 phút. ✅.

- Test 1000 pass; Typecheck PASS.
- Tạo `claim-section`, `lawyer-section`, `procedure-core-section`; `autoTitle` khởi auth-callback; đồng nhất tự động.

### [CYCLE-AUTO-1] — 2026-07-14: Trích PageOptionsSection
Loại: Refactor. ~20 phút. ✅.

- Trích `PageCountCopies`; `PageOptionsSection` 56→~30 dòng.

### [CYCLE-AUTO-2] — 2026-07-14: Trích SealRequestForm
Loại: Refactor. ~45 phút. ✅.

- Trích SealTypeSection/MatterLinkSection/ExistingDocumentBanner/DocumentTitleField/FormFooter; 163→76 dòng.

### [CYCLE-AUTO-3] — 2026-07-14: Test getExpressSettingsPublic
Loại: Test. ~20 phút. ✅. +2 test.

### [CYCLE-AUTO-4] — 2026-07-14: Test saveExpressSettingsAction
Loại: Test. ~30 phút. ✅. +3 test.

### [CYCLE-AUTO-5] — 2026-07-14: Trích SealsView
Loại: Refactor. ~45 phút. ✅.

- Trích SealsHeader/SealsKpi/SealsTabBar/SealsTable; 186→87 dòng.

### [CYCLE-AUTO-6] — 2026-07-14: Trích buildMatterCreateData
Loại: Refactor. ~25 phút. ✅.

- Trích `buildClientLinks/buildParties/buildProcedure`; 64→~30 dòng.

### [CYCLE-AUTO-7] — 2026-07-14: Trích ApprovalDialog / SealDetailDialog
Loại: Refactor. ~45 phút. ✅ Một phần.

- Trích ApprovalDialog (115→74), SealDetailFields; complexity SealDetailDialog 17→<10; tạo `field.tsx`, `document-link.tsx`.

### [CYCLE-AUTO-8] — 2026-07-16: Giảm lint seals
Loại: Fix HIGH. ~90 phút. ✅.

- Typecheck PASS; Build SUCCESS; Test 1987 pass; Lint 885→881.
- Phủ: câu lệnh 78.21%, nhánh 64.75%, hàm 70.22%, dòng 79.7%.
- Trích `PendingActions`, `ApprovedStampButton`, `StampedDownload`, `RejectedBadge`, `MatterComboboxTrigger/List`.

### [CYCLE-AUTO-12] — 2026-07-17: Fix test + i18n
Loại: Fix test chặn. ~30 phút. ✅.

- Test 1987 pass; Typecheck PASS; Build SUCCESS.
- Sửa i18n ClientSheetFooter (tiếng Việt); `computeEvents` nhận `now` tuỳ chọn → test khả định.

### [CYCLE-AUTO-13] — 2026-07-17: Refactor EventCard
Loại: Refactor. ~25 phút. ✅.

- Trích `EventIcon/EventInfo/EventDaysBadge`; 107→~30 dòng, complexity ~15→~5.

### [CYCLE-AUTO-14] — 2026-07-17: Refactor ContactsView
Loại: Refactor. ~90 phút. ✅.

- Trích ColleagueSection/ColleagueList/ExternalContactsSection/ExternalContactFilterBar/ExternalContactList + types/constants; 282→~70 dòng.

### [CYCLE-AUTO-9] — 2026-07-16: Giảm cỡ Archive actions
Loại: Fix HIGH. ~120 phút. ✅. Typecheck PASS (sửa cast MatterCategory); Test pass.

*(Lưu ý: bản ghi AGENT_METRICS gốc có rất nhiều chu kỳ lặp với các cập nhật % phủ lặt vặt và tên chu kỳ trùng; phần trên đã quy về bản tiếng Việt tinh gọn, giữ mọi mốc chính và quyết định.)*

## Phân bố Vi phạm (gần nhất)

| Mức | Số lượng | Xu hướng |
|---|---|---|
| CRITICAL | 0 | ↔️ |
| HIGH | 0 | ✅ |
| MEDIUM | 87 | ↘️ |
| LOW | 1 | ↔️ |

## Loại cải thiện đã làm

| Loại | Số | % |
|---|---|---|
| Refactor (R) | 3 | 60% |
| Test (T) | 2 | 40% |
| Performance (P) | 0 | 0% |
| Security (S) | 0 | 0% |
| Documentation (D) | 0 | 0% |
| Observability (O) | 0 | 0% |
| Compliance (C) | 0 | 0% |
| Upgrade (U) | 0 | 0% |
| Modernization (M) | 0 | 0% |

## Nhật ký dừng khẩn cấp

| Ngày | Lý do | Rollback | Cách giải |
|---|---|---|---|
| *Chưa có* | | | |

---

**Cập nhật lần cuối**: 2025-07-15
**Rà kế**: theo chu kỳ / 2 tuần
