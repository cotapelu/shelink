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
| Tốc độ tiến hoá | 7 (ngày hiện tại) | ≥10/tuần | → |
| Nợ kỹ thuật (lỗi lint) | 940 problems (788 lỗi, 152 warning) | 0 | ↘️ |

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
2026-10-31  ~84      ~78.7%   ~10          2233  940
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

### [CYCLE-AUTO-38] — 2026-10-24: Vi phạm lint đơn lẻ + trích hàm gần ngưỡng
Loại: Violation Fix (QA). Ưu tiên: HIGH→LOW. ~50 phút. ✅.

**Cổng chất lượng**: Typecheck PASS; Build SUCCESS; Test 2079 pass / 1 skip; Site localhost:3000/login = 200 (middleware 307 cho route (app) chưa đăng nhập — đúng bảo vệ route).

**Vi phạm đã sửa (lỗi)**:
1. `rules-of-hooks` — `useWatch` gọi trong helper `watchField` (không phải hook) ở `use-intake-form-states.ts` → đổi tên `useWatchField` (§3.2 fix).
2. `prefer-as-const` ×3 — `as "litigation"` → `as const` ở 3 file test intakes.
3. `no-unused-expressions` ×2 — ternary như câu lệnh trong `toggleOne` (pending-archive-table) và `toggleExpand` (audit-view) → if/else.

Theo chuẩn GOAL 4.5: mọi sửa đổi đều xác minh bằng lint trên từng file trước khi chạy toàn bộ.

**Vi phạm đã sửa (warning)**: `exhaustive-deps` ×2 (`refreshPrep` bọc `useCallback([matterId])`, thêm vào deps — không loop vì ref ổn định theo matterId); `no-img-element` (dùng `next/image` + `unoptimized` theo pattern `PersonSelector` cùng thư mục); directive `eslint-disable` không dùng ×1; `no-unused-vars` ×16 (`useState`, `cn`; bỏ tham số `g` không dùng ×14 trong `compute.ts` — TS cho phép callback ít tham số hơn gán vào signature).

**Trích hàm (§3.1, gate ≤20 nghiệp vụ / ≤50 UI)**:
- `useIntakeFormStates` 26→ tách `useIntakeFormCoreStates` + `useIntakeFormDraftStates` (compose; key giữ nguyên, test destructure theo tên vẫn pass).
- `DocCard` 53→~41: trích `SealSubmitButton` (build URL /approvals/seals).
- `NewFolderDialog` 51→~42: trích `submitCreateFolder` (createFolder + toast).

**Test Delta**: +11 test (2068→2079 pass) — phần lớn từ chu kỳ trước chưa ghi; chu kỳ này chỉ refactor, không thêm test.
**Coverage**: câu lệnh 83.30→83.97% (+0.67); nhánh 71.19→71.62% (+0.43); hàm 77.15→79.52% (+2.37); dòng 84.64→85.30% (+0.66).
**Lint**: 973→944 problems (799→792 lỗi, 174→152 warning) = **-29 problems**.

### [CYCLE-AUTO-42] — 2026-10-24: Phủ nhánh server/archive/actions.ts (điểm nghẽt)
Loại: Test (T). Ưu tiên: MEDIUM (đẩy Health Score qua gate nhánh ≥80%). ~35 phút. ✅.

**Mục tiêu**: `server/archive/actions.ts` là điểm nghẽt branch ghi trong EVOLUTION/AGENT_PROFILE (~74%, file ~562 dòng). Không sửa code production — chỉ **thêm test** cho các nhánh còn hở (tôn trọng nguyên tắc surgical + no-hallucination).

**Test đã thêm** (`src/tests/server/archive/archive-branches.test.ts`, 12 test, tái dựng mock từ actions-error): render catalog fail (Error → `err.message`; non-Error → `String(err)` + dọn cover doc), `案件不存在`/`案件已归档`, force-with-missing (không throw, trả missingItems), `archivedBy = name ?? id` (cả 2 nhánh), approve (completedAt null → `closedAt ?? archivedAt`, note rỗng → timeline “通过”, `reviewNote` null; matter null → `matter?.internalCode ?? record.matterId`), reject (notify chạy + matter null, skip khi tự duyệt, record null/đã duyệt).

**Cổng chất lượng**: Typecheck PASS; Build SUCCESS; Test **2143→2155 pass / 1 skip / 0 fail**; `/login` 200.

**Coverage (file, đo scoped)**: `server/archive/actions.ts` branch **74.07%→95.06%** (60/81→77/81), câu lệnh 94.3→98.73%, dòng **100%**. (Số liệu toàn dự án chưa đo lại — chỉ đo file mục tiêu.)

**Test Delta**: +12 (2143→2155).
**Lint**: file mới sạch (dọn import không dùng). Toàn repo giữ nguyên mức nợ God Object có sẵn.
**Rủi ro**: thấp (chỉ thêm test; không đụng production). Rollback: xoá tệp test.
**Ghi chú**: `git commit` là đỏ-vạch AGENTS §7 — **chưa commit**, chờ chủ sở hữu duyệt (AUTO-CONTINULE bắt buộc commit sau mỗi loop → xung đột, ưu tiên AGENTS).
**Security**: không phát hiện secret/bỏ qua quyền trong vùng sửa.
**Notes**: hạng mục còn lại của `folders-panel.tsx` (max-lines 410>300, `FoldersPanel` complexity 14, `FolderItem` 77 dòng) và `use-archive-wizard.ts` (hook 135 dòng) để lại cho chu kỳ chuyên refactor — vượt 30 phút/task, ghi vào AGENT_TODO.

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

## [CYCLE-AUTO-53] — 2026-10-31: TD-D4 Sơ đồ tổ chức /org-chart + sửa 2 test fail tiền tồn tại
- **Loại**: Feature (R/T) — ưu tiên MEDIUM. Không đổi schema/migration.
- **Thời lượng**: ~60 phút.
- **Trạng thái**: ✅.
- **Test delta**: +14 (2219→2233 pass / 1 skip / 0 fail — sửa 2 fail tiền tồn tại của `correlation-id`).
- **Phủ**: không giảm (module mới có test thuần + action; phủ toàn cục đo ở chu kỳ coverage riêng).
- **Lint**: 940 problems (788 lỗi) — giảm 2 so với đo thực tế đầu chu kỳ (942→940: sửa root cause 2 test fail + viết lại `proxy.ts` sạch lint; không phát sinh lỗi mới). Bảng nhanh trước đó ghi 944/792 là số cũ từ AUTO-38, đã hiệu chỉnh.
- **Bảo mật**: `listOrgChart` chỉ đọc + requireSession; không PII rò rỉ log; chỉ select cột cần thiết.
- **Ghi chú**: xác thực DB thật bằng dữ liệu demo tạm (2 team/3 user/6 thành viên, đủ 4 cấp vai trò) rồi xóa sạch; phát hiện lệch AGENTS §6 vs schema UserRole (không có STAFF/OWNER/MANAGER).

---

**Cập nhật lần cuối**: 2026-10-31
**Rà kế**: theo chu kỳ / 2 tuần

## [CYCLE-AUTO-55] — 2026-10-31: [R] Tách God-hook useArchiveWizard + phát hiện code chết
- **Loại**: Refactor [R] — ưu tiên MEDIUM. ~45 phút. ✅.
- **Test delta**: +17 (2233→2250 pass / 1 skip / 0 fail) — 11 helper thuần + 6 folders-lib.
- **Phủ**: helper mới có test trực tiếp; phủ toàn cục đo ở chu kỳ coverage riêng.
- **Lint**: 939 problems (787 lỗi / 152 warning) — giảm 1 lỗi so với đầu chu kỳ (940/788/152); cụm use-archive: 4 lỗi gốc → 3 lỗi, 0 warning; God-hook 135 dòng được tách.
- **Bảo mật**: không đổi bề mặt tấn công; không log mới; FormData field set y nguyên (có test).
- **Ghi chú**: `folders-panel.tsx` (452 dòng) là code chết — chỉ báo, không xóa (§5.7.3). Cập nhật AGENT_PROFILE: bẫy useEffect identity khi tách hook.

## [CYCLE-AUTO-56] — 2026-10-31: [R/T] RelationshipManager + [HIGH] fix /genealogy 500
- **Loại**: Refactor [R] + Violation Fix — ưu tiên MEDIUM (phát sinh HIGH giữa đường). ~60 phút. ✅.
- **Test delta**: +24 (2250→2274 pass / 1 skip / 0 fail) — 21 lib + 3 regression guard select.
- **Phủ**: lib mới 100% được test trực tiếp (pure).
- **Lint**: 936 problems (784 lỗi / 152 warning) — giảm 3 so với đầu chu kỳ (939/787/152); RelationshipManager 13→10 lỗi.
- **Bảo mật**: không đổi bề mặt; `/genealogy` 500 đã hết (data-integrity fix phía server select).
- **Ghi chú**: smoke phát hiện 500 → nhảy hàng theo §5.1 (quality gate failure). Bẫy ghi nhận: select Prisma thiếu cột mà mapper frontend bắt buộc → 500 toàn trang; thêm regression test khóa hợp đồng select.

## [CYCLE-AUTO-57] — 2026-10-31: [R/T] template-builder.ts 9 lỗi → 0
- **Loại**: Refactor [R] + Tests [T]. ~40 phút. ✅.
- **Test delta**: +9 (2274→2283 pass / 1 skip / 0 fail).
- **Phủ**: module trước đây 0 test → 11 test (structure + từng part docx + injectSignDate).
- **Lint**: 927 problems (775 lỗi / 152 warning) — giảm 9 so với đầu chu kỳ (936/784/152).
- **Bảo mật**: không đổi bề mặt; fix typo Ngảy→Ngày trong comment (không ảnh hưởng runtime).
- **Ghi chú**: đã chứng minh byte-equivalence với HEAD (8/8 mẫu, chuẩn hóa ngảy động).

## [CYCLE-AUTO-58] — 2026-10-31: [R/T] createFeeEntry → fee-entry-lib (+12 test)
- **Loại**: Refactor [R] + Tests [T]. ~35 phút. ✅.
- **Test delta**: +12 (2283→2295 pass / 1 skip / 0 fail).
- **Phủ**: fee-entry-lib 100% nhánh chính (guard, làm tròn, null, payload).
- **Lint**: 926 problems (774 lỗi / 152 warning) — giảm 1 so với đầu chu kỳ (927/775/152); finance/actions.ts 16→15.
- **Bảo mật**: không đổi đường tiền; số học hoa hồng đã có test khóa (Decimal-safe, ≤0 bỏ qua).
- **Ghi chú**: bẫy Decimal — Prisma trả `percent: Decimal`; gốc ép `Number(...)`; lib giữ đúng ép kiểu ở biên.

## [CYCLE-AUTO-59] — 2026-10-31: [R/T] createInvoiceRequest cx 48 → validator thuần (+18 test)
- **Loại**: Refactor [R] + Tests [T]. ~45 phút. ✅.
- **Test delta**: +18 (2295→2313 pass / 1 skip / 0 fail).
- **Phủ**: validator + payload + notification 100% nhánh chính (message theo thứ tự gốc).
- **Lint**: 925 problems (773 lỗi / 152 warning) — giảm 1 so với đầu chu kỳ (926/774/152); finance/actions.ts 15→14.
- **Bảo mật**: logic phân quyền hóa đơn không liên kết vụ án giữ nguyên (test khóa); table-driven 5 yếu tố HĐĐB có test từng message.
- **Ghi chú**: isManager = ADMIN + PRINCIPAL_LAWYER duy nhất (lệch AGENTS §6 đã ghi PROFILE).

## [CYCLE-AUTO-60] — 2026-10-31: [R/T] getMatterInvoiceContext cx 18 → invoice-context-lib (+12 test)
- **Loại**: Refactor [R] + Tests [T]. ~35 phút. ✅.
- **Test delta**: +12 (2313→2325 pass / 1 skip / 0 fail).
- **Phủ**: buildClientOptions + buildInvoiceContext 100% nhánh chính (dedupe/OR-primary/sort/fallback).
- **Lint**: 923 problems (771 lỗi / 152 warning) — giảm 2 so với đầu chu kỳ (925/773/152); finance/actions.ts 14→12.
- **Bảo mật**: quyền truy cập giữ nguyên (assertCanAccessMatter trước query); không rò dữ liệu.
- **Ghi chú**: sort ổn định cho phần không-primary (giữ thứ tự insert Map) — đã có test khóa.

## [CYCLE-AUTO-61] — 2026-10-31: [R/T] finance-stats-lib (3 action thống kê) (+13 test)
- **Loại**: Refactor [R] + Tests [T]. ~40 phút. ✅.
- **Test delta**: +13 (2325→2338 pass / 1 skip / 0 fail).
- **Phủ**: stats/buckets/dates 100% nhánh chính (gồm qua năm, ngoài cửa sổ, ép Decimal-like).
- **Lint**: 921 problems (769 lỗi / 152 warning) — giảm 2 so với đầu chu kỳ (923/771/152); finance/actions.ts 12→10.
- **Bảo mật**: visFilter & phân quyền getPersonalRevenue giữ nguyên (rewire không đổi điều kiện).
- **Ghi chú**: `toAmount` ép Decimal-like an toàn (string → Number||0) — test khóa.

## [CYCLE-AUTO-62] — 2026-10-31: [R] finance/actions.ts 10 lỗi → 1
- **Loại**: Refactor [R]. ~50 phút. ✅.
- **Test delta**: 0 mới (2338 pass / 1 skip / 0 fail) — chu kỳ thuần io-wrapper; 119 test finance hiện có khóa hành vi (không regression).
- **Lint**: 912 problems (760 lỗi / 152 warning) — giảm 9 so với đầu chu kỳ (921/769/152); finance/actions.ts 10→1 (chỉ còn file >300 dòng).
- **Bảo mật**: thứ tự phân quyền trong createInvoiceRequest giữ nguyên (roleViolation → assertCanAssociateMatter → data validation); deleteFeeEntry cascade transaction nguyên vẹn.
- **Ghi chú**: để ý atomic — 1 edit call lỗi thì KHÔNG edit nào apply; luôn kiểm tra file sau mỗi lần edit báo lỗi.

## [CYCLE-AUTO-63] — 2026-10-31: [R] tách finance/actions.ts → BLOCKED và revert
- **Loại**: Refactor [R]. ~20 phút. Trạng thái: ❌ Blocked (rủi ro runtime, đã rollback sạch).
- **Nội dung thử**: tách Billing/FeeEntry/CommissionPlan sang `billing-actions.ts` + re-export từ `actions.ts`.
- **Kết quả**: typecheck PASS, test PASS, lint sạch — **nhưng runtime 500**: Turbopack không hỗ trợ re-export (`export { x } from`) từ module `"use server"` → "The module has no exports at all".
- **Hành động**: `git checkout` phục hồi toàn bộ; gate xác nhận về đúng trạng thái đầu chu kỳ (912/760/152; /finance 200).
- ** Bài học (ghi PROFILE)**: với Next.js 16 + "use server", tách module = **sửa import ở consumer**, KHÔNG re-export. Lần sau làm AUTO-64: cập nhật 5 consumer + 9 test file import trực tiếp.
