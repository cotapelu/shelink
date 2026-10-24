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
- **AUTO-38 (2026-10-24)**: sửa `rules-of-hooks` (bug tiềm ẩn), 3 `prefer-as-const`, 2 `no-unused-expressions`, 2 `exhaustive-deps`, 1 `no-img-element`, 16 `no-unused-vars`; trích 3 hàm (`useIntakeFormStates` 26, `DocCard` 53, `NewFolderDialog` 51). Lint 973→944; coverage hàm 77.15→79.52%; test 2079 pass; typecheck/build xanh; site /login 200.
