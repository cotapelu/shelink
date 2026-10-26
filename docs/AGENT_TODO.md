# Danh sách TODO riêng cho Agent

Cập nhật lần cuối: 2026-10-26 (AUTO-52).

## Chu kỳ đã hoàn thành (gần đây)

### [CYCLE-AUTO-52] — 2026-10-26: TD-B4 (hoàn thiện) — Nhập/sửa nhiệm vụ mặc định + Việt hoá /settings/templates
Loại: Feature + refactor UI (không đổi schema/migration). Owner đã duyệt. ~1h. Nối AUTO-51.

**Đã hoàn thành**:
- [x] Editor nhiệm vụ mặc định: mỗi giai đoạn có thể thêm/xoá `defaultTasks` (Enter hoặc phẩy, cap 20, cắt 120 ký tự) — chip bấm để xoá. Trước đó dialog chỉ hiển thị, không sửa được task.
- [x] Việt hoá toàn bộ màn /settings/templates (trước đó còn chuỗi tiếng Trung — nợ i18n).
- [x] Tách `template-editor-parts.tsx` (Step type, StageList, StepsEditor, StepEditor, StepTaskEditor, NameField, DialogActions) → gỡ nợ lint: `TemplatesView` 81→~20 dòng, `EditTemplateDialog` 122→~45, file ≤300. Cả 2 file **0 lỗi lint**.

**Cổng chất lượng**: typecheck PASS; build SUCCESS; test **2219 pass /1 skip /0 fail** (không đổi — thuần UI); lint 2 file sạch; /settings/templates 307→login (compile). Không đổi schema/migration.

**Kết quả TD-B4**: mẫu giai đoạn giờ quản lý được cả (giai đoạn + nhiệm vụ mặc định), tạo chương trình/dự án tự sinh giai đoạn + nhiệm vụ theo mẫu (AUTO-51). Tiếp theo (GĐ2, không migration): TD-D4 sơ đồ tổ chức (dùng Team/TeamMember), TD-H3 trung tâm trợ giúp, TD-B2/B6 (một phần). Cần migration: TD-A5 ticket/CSAT, TD-B2 budget (1 phần), TD-G3 2FA, TD-D1/D5/D6, TD-C3/C4, TD-E1.

### [CYCLE-AUTO-51] — 2026-10-26: TD-B4 — Sinh nhiệm vụ mặc định theo giai đoạn từ mẫu (StageTemplate.defaultTasks → LegalTask)
Loại: Feature (không đổi schema/migration). Owner đã duyệt. ~1h30.

**Phát hiện**: `stepSchema` (settings) và seed ĐÃ có sẵn `defaultTasks` cho cả 5 mẫu giai đoạn (FIRST/SECOND/INVESTIGATION/PROSECUTION_REVIEW/NON_LITIGATION_PHASE, 31 nhiệm vụ), nhưng `normalizeStageSteps` **bỏ qua** và `seedStagesFromTemplate` không tạo `LegalTask` → nhiệm vụ mặc định "ngủ đông", chưa bao giờ sinh. Cộng thêm: `handleSave` trong editor templates reset `defaultTasks: []` → **xóa task** mỗi khi admin lưu.

**Đã hoàn thành**:
- [x] `stage-template.ts`: `normalizeStageSteps` giữ `defaultTasks` (chỉ đính kèm khi có → không vỡ dữ liệu/kỳ vọng cũ); `seedStagesFromTemplate` nay gọi `seedTasksForStages` sinh `LegalTask` gắn đúng giai đoạn (map theo tên) + `matterId`, giới hạn (20/bước, 200 tổng). Guard no-op khi không có task / client thiếu method / thiếu matterId → không bao giờ chặn tạo thủ tục (an toàn cho tx/mock). Tách hàm ≤20 dòng, complexity ≤10.
- [x] Editor templates: sửa bug mất dữ liệu (`handleSave` giữ `defaultTasks`); tách `StageList` hiển thị giai đoạn + nhiệm vụ mặc định (đọc-quan). `TemplatesView` 81→64 dòng (giảm nợ).
- [x] Test: +4 (normalize defaultTasks; sinh task gắn stage; không gọi khi không có task; bỏ qua khi thiếu matterId) → 13.

**Cổng chất lượng**: typecheck PASS; build SUCCESS; test toàn bộ **2219 pass /1 skip/0 fail** (2215→+4, không hồi quy ở 5 test flow gọi seeder — nhờ guard); lint code mới sạch (2 lỗi `templates-view` là nợ God-object >50 dòng có sẵn, đã giảm). Xác thực DB thật: 5/5 mẫu có `defaultTasks` (31 task), normalize giữ nguyên, 3 delegate (`matterProcedure`/`matterStage`/`legalTask`) chạy đúng.

**Roadmap**: mỗi thủ tục mới từ mẫu giờ tự sinh giai đoạn + nhiệm vụ. Follow-up: UI nhập/sửa `defaultTasks` trong dialog template + Việt hoá màn /settings/templates (đang còn chuỗi tiếng Trung — nợ i18n cũ); lưu ý auth dev 500 do key SSH (AUTO-49).

### [CYCLE-AUTO-50] — 2026-10-26: TD-G6 — Sao lưu toàn bộ dữ liệu (JSON) tự phục vụ (thay stub)
Loại: Feature (không đổi schema/migration). Owner đã duyệt commit. ~1h30.

**Đã hoàn thành** (cấu hình thuần → server function → route → UI → test):
- [x] `server/backup/snapshot.ts` (thuần): 3 phạm vi `genealogy`/`erp`/`all` (all = business-core ∪ genealogy ∪ erp, khử trùng), `BACKUP_SPECIAL_SELECTS` **loại secret** (`user.passwordHash`, `document.path/iv/authTag`), `buildBackupMeta` (đếm model/bản ghi, cờ `truncatedModels` khi chạm trần 20k), `buildBackupFilename`, `isBackupScope` guard.
- [x] `server/backup/collect.ts`: đọc song song từng model (giới hạn `take`), bỏ qua delegate thiếu (phòng vệ), trả `sections`+`counts`.
- [x] Route `GET /api/backup/export?scope=…`: chỉ `isManager` (ADMIN/PRINCIPAL_LAWYER), ghi `AuditLog DATA_BACKUP_EXPORT`, trả JSON tải về (`Content-Disposition`).
- [x] UI `/settings/data`: 3 nút xuất đổi sang tải thật `<a href=/api/backup/export download>` qua `BackupExportCard`; tách `BackupExportCard`+`BackupImportCard` để trang <50 dòng (sửa luôn lỗi lint có sẵn). Bỏ stub `exportData` (mồ côi); `importData` trung thực báo "chưa hỗ trợ" (TD-G7 sau).
- [x] Test: `snapshot.test.ts` (6) + `collect.test.ts` (2 — gồm nhánh bỏ qua delegate thiếu).

**Cổng chất lượng**: typecheck PASS; lint sạch các file đổi (0 lỗi/0 warning); test toàn bộ **2215 pass /1 skip/0 fail** (2207→+8); build SUCCESS. Xác thực DB thật bằng tsx: `all`=51 model, `erp`=12, `genealogy`=4 — không delegate thiếu, không lỗi query. Dev :3000 `/api/backup/export` 307 (guard), `/settings/data` 307→login (compiled).

**Roadmap GĐ2 còn lại**: TD-G7 nhập/phục hồi (parse JSON backup), TD-A5 ticket/CSAT (migration), TD-B4 template dự án, TD-D1/D5/D6, TD-C3/C4 kế toán, TD-G3 2FA (migration), TD-G9/10/12/13/14/15, TD-H1/H2. Vẫn còn nợ: auth dev 500 do key SSH (xem AUTO-49); God Object `clients/actions.ts`.

### [CYCLE-AUTO-49] — 2026-10-26: TD-A5 — Dòng thời gian tương tác khách hàng (hoàn tất Customer 360)
Loại: Feature (không đổi schema/migration). ~1h30. Kế thừa AUTO-47 (báo giá/hợp đồng trên /clients/[id]).

**Đã hoàn thành** (Data→Types→Server Action thuần→Action→UI→Test):
- [x] `src/server/clients/timeline.ts` (thuần): `buildClientTimeline` gộp 6 nguồn chạm — tiếp nhận (`IntakeStatus`→nhãn VI), dự án (mở/tiếp nhận/kết thúc/lưu trữ), ghi chép giao tiếp (`NoteChannel`→VI, cắt 140 ký tự), thu tiền (`FeeEntry RECEIVED`), báo giá (`issuedAt ?? createdAt`), hợp đồng (`signedAt ?? createdAt`) — sắp xếp mới nhất trước, giới hạn 60. Nghiệp vụ nằm hết ở hàm thuần (AGENTS §5.3).
- [x] `server/clients/actions.ts`: `getClientTimeline` (đọc-quan, quyền dùng lại `assertClientReadable`) + helper 2 chặng (`fetchTimelineSources`; notes/payments chỉ query khi có matter). Dự án của khách = `primaryClientId` OR `clientLinks.some`.
- [x] UI `_components/timeline-section.tsx` (presentational, icon/màu theo nguồn, số tiền `tabular-nums`) + lắp vào `/clients/[id]` (thêm vào Promise.all hiện có).
- [x] Test: `timeline.test.ts` (7 — merge/sort/cap/fallback/label) + mở rộng `actions.test.ts` (3 — manager, rỗng, phân quyền; thêm `matter.findMany`/`intake`/`note` vào mock) + `timeline-section.test.tsx` (3).

**Cổng chất lượng**: typecheck PASS; prisma:validate PASS; test toàn bộ **2207 pass /1 skip /0 fail** (2194→+13); build SUCCESS; dev :3000 `/login` 200, `/clients/[id]` 307→login đúng guard, log không lỗi runtime/compile. Query timeline xác thực trực tiếp trên DB dev (khách demo: 1 tiếp nhận → timeline hiển thị). Lint: file mới sạch; 2 hàm timeline ≤20 dòng.

**Phát hiện RỈM (không sửa — đỏ-vạch `.env`, thuộc hạ tầng, chờ chủ sở hữn)**: đăng nhập dev bị **500** vì `src/lib/auth/jwt.ts` kỳ vọng key **PEM** (PKCS#8 private / SPKI public) nhưng `.env` đang để **format SSH** (`ssh-rsa` public / `OPENSSH PRIVATE KEY` private). `importRsaPublicKey` còn ném "SSH public key format not supported". Hệ quả: encode → 500 khi login; decode → null → mọi request có cookie session đều 307. **Hoàn toàn không liên quan thay đổi này.** Nên sinh lại key PEM: `ssh-keygen -t rsa -b 4096 -m PEM -f jwt` rồi cập nhật `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`. Do đó phần "đường vàng" cần session chưa chạy được qua trình duyệt trong môi trường dev hiện tại (đã bù bằng xác thực DB + unit/component test).

**Roadmap TD-A5 còn lại**: ticket/phiếu yêu cầu, CSAT/NPS (cần migration — xin duyệt). Lưu ý: `server/clients/actions.ts` vẫn là God Object có sẵn (file >300 dòng, nhiều hàm >20) — có thể trích riêng module `clients-timeline.server` trong refactor sau.
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

### [CYCLE-AUTO-43] — 2026-10-24: Nút "Tạo tiếp nhận" trên pipeline /intakes (follow-up AUTO-41)
Loại: Feature (tái dùng, không đổi schema/migration). ~40 phút. ✅.

**Đã hoàn thành**:
- [x] Nút "Tạo tiếp nhận" trên `/intakes`: component mới `intakes/_components/intake-create-button.tsx` — lazy nạp `clientOptions` (`listClients`) + `colleagues` (`listActiveColleagues`) **một lần** khi mở; mở lại không gọi lại (cache theo phiên dialog); lỗi nạp options không chặn mở form; đóng sheet → `onCreated` làm mới pipeline.
- [x] Tái dùng `IntakeSheet` sẵn có (không nhân bản form; tránh phình `intake-sheet.tsx`). Lắp vào header trang `/intakes/page.tsx` (flex, nút bên phải, `onCreated={load}`).
- [x] 5 test component (`intake-create-button.test.tsx`): render nút, nạp options 1 lần + mở sheet, không nạp lại khi mở lại, `onCreated`, và degrade khi options lỗi.

**Cổng chất lượng**: typecheck PASS (`tsc --noEmit`=0); lint sạch 3 file đổi; test file mới 5/5; build SUCCESS; dev server cổng 3000: `/login` 200, `/intakes` 307→`/login?callbackUrl` (guard đúng, route compile). **Ghi chú**: `next start` production hiện 500 do instrumentation hook lỗi module `server/cron/scheduler` trong bundle build — **lỗi có sẵn, không do thay đổi này** (DEV chạy bình thường; profile từng ghi "tắt instrumentationHook").

### [CYCLE-AUTO-44] — 2026-10-24: Wire thuật ngữ cấu hình vào pipeline Tiếp nhận (TD-G1 consumption)
Loại: Feature (hoàn tất follow-up AUTO-43; không đổi schema/migration). ~45 phút. ✅.

**Việc đã làm**:
- [x] `TerminologyProvider` (client, `components/layout/terminology-provider.tsx`) + context; `useTerminology()` nâng cấp: ưu tiên `stored` > context > `DEFAULT_TERMS`. Hook trước đó **chưa ai dùng** → an toàn đổi hành vi.
- [x] `(app)/layout.tsx` đọc `readTerms()` (SystemSetting) 1 lần/layout, bọc `<TerminologyProvider>`; `saveTerminologyAction` đã `revalidatePath("/","layout")` nên lưu ở /settings/terminology là áp nhãn ngay toàn app.
- [x] Pipeline theo thuật ngữ: `pipeline-lib.ts` thêm `buildIntakeStages(intakeTerm)` + `DROPPABLE_INTAKE_STAGES` (hằng số kéo, `canMove` dùng lại); `IntakePipeline` nhận prop `stages`; trang `/intakes` dùng `terms.intake` cho tiêu đề + cột đầu. Rename "Tiếp nhận"→"Cơ hội" ở settings sẽ đổi cả H1 lẫn cột kanban.
- [x] Test: +`use-terminology.test.tsx` (4: default, provider, stored override, null→provider) + mở rộng `pipeline-lib.test.ts` (builder dùng thuật ngữ, fallback rỗng, canMove chặn stage lạ).

**Cổng chất lượng**: typecheck PASS; lint sạch; test toàn bộ **2167 pass /1 skip /0 fail** (2155→+12); build SUCCESS; dev :3000 `/login`200, `/intakes` và `/settings/terminology` 307→login đúng guard.

### [CYCLE-AUTO-45] — 2026-10-24: Sinh giai đoạn mặc định theo loại hình (StageTemplate → MatterStage)
Loại: Feature (dùng model sẵn có, **không đổi schema/migration**). ~1 giờ. ✅.

**Bối cảnh**: `StageTemplate` (DATA-MODEL §4.13) chỉ đọc/ghi ở `/settings/templates`, **chưa từng được áp dụng**; UI settings ghi "chỉ ảnh hưởng thủ tục mới tạo" nhưng chưa đúng. Đây là phần áp dụng còn thiếu.

**Đã hoàn thành**:
- [x] `src/server/procedures/stage-template.ts`: `normalizeStageSteps(Json)` thuần + bền vững (bỏ item hỏng/thiếu tên, cắt tên, ghép `order`, sắp xếp, chặn 50); `seedStagesFromTemplate(client, procedureId, procedureType)` đọc mẫu `default-{procedureType}` → `matterStage.createMany`; không có mẫu/mẫu rỗng → trả 0 (không chặn tạo thủ tục).
- [x] Wire 2 điểm tạo thủ tục: `addProcedure` (chỉ ENGAGED, bỏ qua INFORMATIONAL) và `createFirstProcedure` trong conversion (**cùng transaction**, nên intake→matter cũng sinh giai đoạn).
- [x] Test: `stage-template.test.ts` (9 — parse edge cases + seed: no-template/empty/count). Sửa 4 file test cũ để mock bổ sung `stageTemplate.findUnique` (hợp đồng mới: tạo thủ tục nay đọc thêm mẫu).

**Cổng chất lượng**: typecheck PASS; lint — file mới sạch, không phát sinh lỗi mới (9 lỗi `procedures/actions.ts` là nợ **có sẵn** từ HEAD: God function/file >300 dòng; `addProcedure` gọn 1 dòng để giảm footprint); test toàn bộ **2176 pass /1 skip /0 fail** (2167→+9); build SUCCESS; dev :3000 (1 lệnh tự chứa) `/login`200, `/intakes`+`/settings/templates`+`/settings/terminology` 307→login đúng guard, không lỗi runtime.

### [CYCLE-AUTO-46] — 2026-10-24: Sửa `next start` production 500 (instrumentation bọc bundler sai) 🔧
Loại: Fix. ~20 phút. ✅. **Sửa theo yêu cầu chủ sở hữn duyệt commit.**

**Root cause**: `instrumentation.ts` import scheduler bằng `await import(/* webpackIgnore: true */ "./server/cron/scheduler")`. `webpackIgnore` bảo bundler **không** gói import nội bộ này → khi `next start`, runtime tìm `./server/cron/scheduler` trong `.next-build/server/chunks/` và không thấy → instrumentation hook crash → **mọi request 500** (kể cả `/login`). Đường dẫn local phải để bundler gói.

**Sửa**: bỏ `webpackIgnore: true` (giữ nguyên guard `NEXT_RUNTIME==="nodejs"` + `NODE_ENV!=="production"` + `DISABLE_CRON`); hiệu chỉnh comment cũ (nói Next 14.x/edge, gây hiểu nhầm).

**Xác thực**: rebuild → `registerCronJobs` đã nằm trong server chunk; `next start` :3100 `/login`=**200** (trước 500), `/intakes`+`/settings/templates` 307→login; log khởi động "[cron] da dang ky 5 tac vu dinh ky" → instrumentation chạy đúng. Dev :3200 `/login`=200, `/intakes`=307, không lỗi → **không hồi quy**. tsc=0; lint file=0; test **2176 pass/1 skip/0 fail**; build SUCCESS.

**Giai đoạn 1 (P0)**: ✅ hoàn tất toàn bộ (AUTO-39→46: quote/contract/timesheet/expense/cash/terminology/email/aging/pipeline UI + nút tạo + wire thuật ngữ + seed giai đoạn + sửa `next start`).

### [CYCLE-AUTO-47] — 2026-10-24: Customer 360 — Báo giá & Hợp đồng trên /clients/[id] (TD-A5 partial) + seed mẫu khái quát
Loại: Feature (không đổi schema/migration). Owner đã duyệt commit. ~1h30. ✅.

**Đã hoàn thành**:
- [x] Seed mặc định (commit `fabe967`): thêm `StageTemplate` `NON_LITIGATION_PHASE` tiếng Việt (4 bước: Tiếp nhận&làm rõ YC → Triển khai → Nghiệm thu/bàn giao → Kết thúc&lưu trữ) để tính năng seed giai đoạn (AUTO-45) phát huy cho công ty phi tố tụng. DB xác nhận 5 template.
- [x] TD-A5 partial: `getClientCommercialSummary(clientId)` (`server/clients/actions.ts`) — báo giá + hợp đồng gần đây của khách; **trích `assertClientReadable`** dùng chung với finance summary (gỡ trùng lặp quyền — anti-pattern Shotgun Surgery) + 2 helper query. UI `commercial-section.tsx` (2 bảng dùng chung `CommercialTable`, badge báo giá tái dùng `QuoteStatusBadge`) lắp vào trang `/clients/[id]`.
- [x] Test: +2 (`getClientCommercialSummary`: nhánh quản lý map số tiền + quyền non-manager).

**Cổng chất lượng**: typecheck PASS; lint **không phát sinh lỗi mới** (7 lỗi `clients/actions.ts` là nợ có sẵn từ HEAD — hàm >20 dòng/file >300; hàm mới ≤20); test toàn bộ **2178 pass /1 skip /0 fail** (2176→+2); build SUCCESS; dev `/login`200, `/clients/[id]` 307→login đúng guard.

**Roadmap TD-A5 còn lại**: timeline tương tác hợp nhất (call/email/họp/phiếu), ticket, CSAT/NPS; và các module GĐ2 khác (TD-A8 email 2 chiều, TD-B2 ngân sách dự án [cần migration], TD-B6 workflow duyệt, TD-G3 2FA [cần migration], TD-D1/D2/D6…). Lưu ý: task cần **schema migration** phải xin chủ sở hữn duyệt trước (AGENTS.md đỏ-vạch).

### [CYCLE-AUTO-48] — 2026-10-26: TD-D2 Nghỉ phép (docs-first → migrate → server → UI → test → gate)
Loại: Feature (owner đã duyệt **và** duyệt migration). ~2h. ✅.

**Docs-first (§5.1)**: PRD (bảng module GĐ2 "Nghỉ phép" + luồng §10.5), DATA-MODEL §4.33 + quyết định #19 + index, UI-DESIGN §7.11.

**Schema/migration**: `LeaveRequest` + 2 enum (`LeaveType`, `LeaveStatus`) — SQL additive sạch; `migrate dev --create-only` → xem SQL → `migrate deploy` (local). **Sản xuất cần chạy `prisma migrate deploy`**.

**Server `src/server/leave/`**: `schemas.ts` (zod, cross-field end≥start, reject bắt buộc lý do), `balance.ts` thuần (ngày inclusive, parse setting, usedDays = Σ ACTIVE cùng năm, remaining floor 0), `actions.ts` (create/list/decide/cancel; quyền: duyệt = isManager, rút = chủ đơn/manager khi còn SUBMITTED/DRAFT; audit + revalidate; hàm ≤20).

**UI `/leave`**: trang server + `leave-view` (tab Của tôi/Của đội nhóm/Tất cả, thẻ số dư, hook `useLeaveMutations`), `leave-request-sheet` (Sheet, live tính số ngày, Lưu nháp/Gửi duyệt), `leave-table`, `leave-reject-dialog`, labels. Thêm nav "Nghỉ phép".

**Test**: balance.test.ts (5) + actions.test.ts (10). Lưu ý: id test phải là **cuid** hợp lệ (`.cuid()`), không phải "lv1".

**Cổng chất lượng**: typecheck PASS; lint PASS (module leave 0 lỗi — tách nhỏ hàm ≤20/≤50); test toàn bộ **2194 pass/1 skip/0 fail** (2178→+16); build SUCCESS; dev `/login`200, `/leave` 307→login đúng guard.

**Roadmap còn lại (GĐ2)**: TD-A5 timeline/ticket, TD-B6 workflow duyệt, TD-D1/D5/D6 (migration), TD-C3/C4 kế toán (migration), TD-G3 2FA (migration), TD-G6 export/backup, TD-G7 import, TD-A8/Zalo tích hợp, TD-G9/10/12/13/14/15, TD-H1/H2. Làm tiếp tuần tự, commit từng module.

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
