# Danh sách TODO riêng cho Agent

Cập nhật lần cuối: 2026-10-24 (AUTO-41).

## Chu kỳ đã hoàn thành (gần đây)
- ✅ Chu kỳ 0–75: khôi phục cổng chất lượng, đẩy phủ, refactor 3 lô.
- ✅ P0: sửa ngoại lệ giới hạn tốc độ (CVE-2025-001).
- ✅ P1: code JWT RS256 xong (chờ deploy); kiểm tra quyền pass.
- ✅ Lint: 120 → 0 cảnh báo.
- ✅ Test: 1.365+ pass; phủ câu lệnh 98%, nhánh 94%, hàm 70%.
- ✅ Typecheck, build xanh.
- ✅ Refactor: trích PurposeSection khỏi seal-request-sheet (327→317 dòng).

## Tác vụ đang chạy (2 tuần tới)

### Ra từ chu kỳ AUTO-38 (2026-10-24)
- [ ] **Refactor `folders-panel.tsx`** (410 dòng > 300): trích `FolderItem`/`DocCard`/`SealSubmitButton`/2 dialog ra file anh em `folders-panel-parts.tsx`; gộp `NewFolderDialog` + `RenameFolderDialog` (cấu trúc trùng) → `FolderNameDialog`.
- [ ] `FoldersPanel` complexity 14 > 10: tách phần dựng `byFolderId`/`activeDocs` thành hook/helper thuần.
- [ ] **`use-archive-wizard.ts`** (135 dòng): hook >20 dòng — tách state/prep/upload/submit thành sub-hook (`useArchivePrep`, `useArchiveUpload`, `useArchiveSubmit`).
- [ ] **Duplication (§3.2 Shotgun Surgery)**: hai bảng `rules` giống nhau trong `transformViaA_bCallsA`/`transformViaB_aCallsB` (`utils/kinship/compute.ts`) → trích hằng số dùng chung.
- [ ] **Phủ hàm**: 79.52% → cần +0.48% chạm gate 80%; ưu tiên component vừa trích (`DocCard`, `SealSubmitButton`, `SealSubmitButton` URL builder) và `use-archive-wizard`.
- [ ] **Phủ nhánh**: 71.62% → gate 80% (thiếu 8.38%); điểm nghẽn cũ: `utils/kinship/compute.ts`, `server/archive/actions.ts`.

### Ưu tiên cao
- [ ] **Refactor God Object**:
  - `intake-sheet.tsx` (~1570 dòng): trích Partie/CauseFee/Procedure/Documents/Submission.
  - `procedure-content.tsx` (1357 dòng): tách procedure-form/info/documents.
  - `export-xlsx.ts` (1058 dòng): module hoá export theo miền.
  - `finance-forms.tsx` (747 dòng): tách fee entry / create invoice.
  - `seal-request-sheet.tsx` (317 dòng): tiếp tục trích PageCount/Document/FileUpload/ActionButtons.
  - `client-sheet.tsx` (604), `seals-view.tsx` (376), `conflicts-view.tsx` (226).
- [ ] **Đẩy phủ**: hàm ≥80% (hiện 70%).
- [ ] **Giảm cảnh báo lint còn lại** (~117).
- [ ] **Quan sát**: bọc thêm server action (archive, ai, clients) bằng `withMetrics`.
- [ ] **Bật bảo vệ nhánh**: GitHub Actions yêu cầu `quality.yml` trên main/develop.

### Ưu tiên trung bình
- [ ] **Test tích hợp**: luồng chính (intake→matter, tạo client, xuất hóa đơn).
- [ ] **Cache API**: dùng `fetch-cache.ts` trong `client.ts` cho endpoint liệt kê.
- [ ] **Tài liệu**: JSDoc cho hook/utils mới.
- [ ] **Hiệu năng**: benchmark API then chốt; xử lý N+1.

### Ưu tiên thấp
- [ ] **Nâng cấp phụ thuộc**: `npm outdated` rồi thử (Next.js, Prisma, React).
- [ ] **Hiện đại hoá**: các pattern async/await còn lại; bật strict TS dần.
- [ ] **Rà soát bảo mật**: quay secret nếu có; đảm bảo giảm thiểu STRIDE.

## Mục tiêu chỉ số (tuần tới)
- Health Score: ≥88/100
- Tốc độ tiến hoá: ≥5 cải tiến/tuần
- Nợ kỹ thuật: giảm 5 TODO/FIXME
- Phủ nhánh: ≥95% (hiện 94%)

## Ghi chú
- Chu kỳ phát hiện 2 giờ/lần; đang quét tự động.
- Mọi thay đổi phải qua cổng chất lượng trước khi commit.
- Rollback: `git revert`.

## Nhật ký chu kỳ gần nhất

### [CYCLE-AUTO-39] — 2026-10-24: Giai đoạn 1 thương mại (P0)
Loại: Feature (docs-first → schema → migrate dev local → server → UI → test). ~4 giờ. ✅.

**Docs-first (§5.1)**: AGENTS.md (luồng + thuật ngữ), PRD (§3.b module mới, quyết định #19-#22, §10.4), DATA-MODEL v0.48 (§4.28-§4.32), UI-DESIGN v0.3 (§7.6-§7.10), TODO.md (roadmap 70 task).

**Schema**: migration `20261024022214_commercial_core_stage1` (6 model mới: Quote/QuoteItem/Contract/ContractEvent/TimesheetEntry/ExpenseClaim/CashAccount + 8 enum + FeeEntry.accountId). SQL thuần additive; đã apply DB dev local — **sản xuất cần chủ sở hữu duyệt `migrate deploy`**.

**Đã hoàn thành**:
- [x] TD-A3 Báo giá: server + UI + 11 test (pricing thuần + actions: convert contract/matter trong transaction).
- [x] TD-A4 Hợp đồng: vòng đời + gia hạn + events + 4 test.
- [x] TD-B1 Ghi giờ: validate 0.25h/bắt buộc gắn đối tượng + duyệt + 4 test.
- [x] TD-C5 Chi phí: duyệt đa cấp, payExpense sinh FeeEntry COST cùng transaction + 5 test.
- [x] TD-F1 Email: mailer SMTP (lazy, không hard-code secret) + 5 mẫu.
- [x] TD-G1 Thuật ngữ: lib + server + hook qua SystemSetting.
- Nền tảng: nextSequenceCode (đếm nguyên tử), nav mới (Báo giá/Hợp đồng/Ghi giờ/Chi phí), nodemailer.

**Còn lại GĐ1 sau AUTO-39**: TD-C1 UI quỹ, TD-C2 bảng tuổi nợ, settings/terminology, settings/email → **hoàn tất ở AUTO-40**; chỉ còn **TD-A1/A2 pipeline lead kanban** (SLA + kéo-thả) chưa làm.

**Cổng chất lượng**: typecheck PASS; lint 944 (không tăng); test 2079→2103 pass; build SUCCESS; /login 200.


### [CYCLE-AUTO-40] — 2026-10-24: Hoàn tất GĐ1 P0 (Quỹ/Thuật ngữ/Email/Tuổi nợ)
Loại: Feature (docs đã có sẵn v0.48 §4.31/§4.32 §7.10 → Data→Types→Server Action→UI→Test). ~3 giờ. ✅.

**Đã hoàn thành**:
- [x] TD-C1 Quỹ (`/settings/cash-accounts`): model sẵn có → server `server/cash-accounts/` (schemas+actions+balance thuần); số dư tính tại chỗ `openingBalance + Σ thu(RECEIVED) − Σ chi(COST/REFUND)` qua `groupBy` (không N+1, bỏ qua RECEIVABLE/COMMISSION). UI bảng số dư + dialog tạo/sửa + bật/tắt. Phân quyền: xem = quản lý/FINANCE, sửa = quản lý. Nav link. 8 test.
- [x] TD-G1 Thuật ngữ UI: page `/settings/terminology` + form client gọi `saveTerminologyAction` (revalidate layout). 2 test.
- [x] TD-F1 Email settings UI: thêm template `test-email`; page `/settings/email` hiện trạng SMTP (che PASS/USER, chỉ xem env) + gửi thử `sendTestEmail`. Sửa đồng bộ lỗi tiềm ẩn AUTO-39: `SendMailInput.subject` required nhưng không dùng → optional. 9 test (templates + actions).
- [x] TD-C2 Bảng tuổi nợ: helper thuần `server/finance/aging.ts` (buckets 0-30/31-60/61-90/>90, anchor = RECEIVABLE xa nhất; xấp xỉ FIFO vì chưa phân bổ từng đồng); action `getReceivablesAging` (mình hoá visibility, 1 query); tab "Công nợ" trong finance-view. 6 test.

**Refactor nhỏ (gate ≤50 UI / ≤20 business)**: tách cash-accounts-view thành orchestrator + table + dialog + types; receivables-aging/email-form tách sub-component.

**Còn lại GĐ1**: TD-A1/A2 pipeline lead kanban (`/intakes` kanban + SLA + moveIntakeStage).

**Cổng chất lượng**: typecheck PASS; prisma:validate PASS; test 2126 pass (2079→…+24 mới); build SUCCESS; /login 200, 3 route mới compile (307→login đúng guard). Lint: các file module mới sạch; `server/finance/actions.ts` & `finance-view.tsx` là God Object **đã** vượt gate từ trước (nợ kỹ thuật, chưa đụng refactor lớn — ngoài phạm vi tuần này). **Chưa commit** (chờ chủ sở hữu duyệt theo §7).


### [CYCLE-AUTO-41] — 2026-10-24: Pipeline tiếp nhận Kanban (TD-A1/A2, hoàn tất GĐ1)
Loại: Feature (docs sẵn §3.a/§7.6 → Data→Types→Server Action→UI→Test). **Không đổi schema** (tránh đỏ-vạch migration). ~2.5 giờ. ✅.

**Đã hoàn thành**:
- [x] TD-A1/A2 Pipeline `/intakes`: `moveIntakeStage` (server, `server/intakes/actions.ts`) — kéo-thả chỉ đổi giữa 2 cột đang xử lý `INTAKE ↔ PENDING_CONFIRMATION`; quyền = quản lý (isManager) hoặc owner/co/creator (`assertCanMoveStage`); ghi `AuditLog` (không có bảng Timeline cho Intake → không migration); về `PENDING_CONFIRMATION` thì `notifyRoleApprovers`. Chuyển cần lý do/duyệt (BỔ SUNG/TỪ CHỐI/ĐÃ CHUYỂN) vẫn dùng `markIntakeNeedsRevision`/`declineIntake`/`convertIntakeToMatter` (không cho kéo). 8 test.
- [x] UI kanban (`_components/intake-pipeline.tsx` + `pipeline-lib.ts` thuần): dnd-kit (dependency đã cài nhưng trước đó chưa dùng), cột theo `IntakeStatus`, chỉ 2 cột droppable; badge SLA `chờ X giờ` (cảnh báo vàng > 24h); toggle Kanban/`Danh sách`; avatar chữ cái phụ trách; link chi tiết. 7 test (SLA/canMove thuần).
- [x] Trang `/intakes` viết lại: dùng `listIntakes` chuẩn (module số nhiều, `withMetrics`) thay cho `@/server/intake` (bản số ít trùng lặp cũ).

**Follow-up (để đăng ký GĐ2)**: nút “Tạo tiếp nhận” trên trang (cần `IntakeSheet` + `clientOptions`/`colleagues`); `stageTemplates` mapping theo loại hình; đổi nhãn trạng thái qua thuật ngữ cấu hình.

**Cổng chất lượng**: typecheck PASS; test **2143** pass /1 skip /0 fail (2126→+17); build SUCCESS; `/intakes` compile (307→login). Lint: file mới sạch; `server/intakes/schemas.ts` có 1 lỗi `requireLitigationStandings` (24>20) **có sẵn từ trước, không do chu kỳ này**. **Chưa commit** (chờ chủ sở hữu duyệt theo §7).

### [CYCLE-AUTO-42] — 2026-10-24: Phủ nhánh server/archive/actions.ts (type [T])
Loại: Test. Ưu tiên: MEDIUM (điểm nghẽt branch → Health Score). ~35 phút. ✅.

**Mục tiêu**: `server/archive/actions.ts` là điểm nghẽt branch (~74%) ghi trong EVOLUTION/AGENT_PROFILE. **Không sửa production** — chỉ thêm `src/tests/server/archive/archive-branches.test.ts` (12 test) phủ các nhánh còn hở: catalog render fail (Error/String + dọn cover doc), `案件不存在`/`案件已归档`, force-with-missing, `archivedBy = name ?? id`, approve (completedAt null, note rỗng, matter null), reject (notify run/skip, record null/đã duyệt).

**Cổng chất lượng**: typecheck PASS; build SUCCESS; test **2143→2155** pass /1 skip /0 fail; /login 200. Coverage (scoped) `archive/actions.ts`: branch **74→95%**, lines 100%. File mới lint sạch.

**GĐ1**: ✅ hoàn tất (AUTO-40 + AUTO-41). **Ghi chú**: `git commit/push` là đỏ-vạch §7 — **chưa commit**, chờ chủ sở hữu duyệt (AUTO-CONTINULE yêu cầu commit sau mỗi loop → xung đột, ưu tiên AGENTS).

- **AUTO-38 (2026-10-24)**: sửa `rules-of-hooks` (bug tiềm ẩn), 3 `prefer-as-const`, 2 `no-unused-expressions`, 2 `exhaustive-deps`, 1 `no-img-element`, 16 `no-unused-vars`; trích 3 hàm (`useIntakeFormStates` 26, `DocCard` 53, `NewFolderDialog` 51). Lint 973→944; coverage hàm 77.15→79.52%; test 2079 pass; typecheck/build xanh; site /login 200.
