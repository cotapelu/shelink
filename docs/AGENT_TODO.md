# Danh sách TODO riêng cho Agent

Cập nhật lần cuối: 2025-07-09

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

**Còn lại GĐ1**: TD-C1 UI quỹ (CashAccount settings page), TD-C2 bảng tuổi nợ, TD-A1/A2 pipeline lead kanban, settings/terminology page, settings/email page.

**Cổng chất lượng**: typecheck PASS; lint 944 (không tăng); test 2079→2103 pass; build SUCCESS; /login 200.


- **AUTO-38 (2026-10-24)**: sửa `rules-of-hooks` (bug tiềm ẩn), 3 `prefer-as-const`, 2 `no-unused-expressions`, 2 `exhaustive-deps`, 1 `no-img-element`, 16 `no-unused-vars`; trích 3 hàm (`useIntakeFormStates` 26, `DocCard` 53, `NewFolderDialog` 51). Lint 973→944; coverage hàm 77.15→79.52%; test 2079 pass; typecheck/build xanh; site /login 200.
