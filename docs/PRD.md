# LawLink — Tài liệu Yêu cầu Sản phẩm (PRD)

> 版本 (Phiên bản): v0.47 (khái quát hóa: công ty nhỏ / văn phòng độc lập)
> Cập nhật lần cuối: 2026-06-05
> Trạng thái: Đã xác nhận với chủ sở hữu (Yến)

---

## Giới thiệu phiên bản

Tài liệu này được **viết lại bằng tiếng Việt** từ bản gốc, vừa giữ toàn bộ lịch sử quyết định, vừa mở rộng theo định hướng **khái quát hóa**: từ phần mềm quản lý vụ án dành cho luật sư, tiến tới một **ứng dụng quản trị cho công ty nhỏ / văn phòng độc lập bất kỳ ngành** (tư vấn, thiết kế, kế toán, marketing, thương mại nhỏ…).

Ánh xạ thuật ngữ dùng xuyên suốt:

| Thuật ngữ luật (gốc) | Khái quát hóa |
|---|---|
| Matter (vụ án) | Dự án / Hợp đồng / Công việc |
| Intake (tiếp nhận) | Lead / Cơ hội / Tiếp nhận yêu cầu |
| Client (khách hàng) | Khách hàng |
| Party (đương sự) | Bên liên quan / Đối tác |
| Procedure (thủ tục) | Giai đoạn xử lý |
| Conflict (xung đột lợi ích) | Đánh giá rủi ro đối tác / nhà cung cấp |
| Billing / FeeEntry | Hóa đơn / Thu chi / Công nợ |

---

## 一、Tầm nhìn sản phẩm

**Mục tiêu**: Cho công ty nhỏ và văn phòng độc lập một hệ thống quản lý **không rườm rà, trực quan, dùng được ngay**, bám sát luồng công việc thực tế.

Không cạnh tranh với các hệ ERP lớn về "đủ mọi thứ", mà cạnh tranh ở:

- **Tự triển khai, dữ liệu trong tay bạn**: Không bị ràng buộc SaaS đa thuê bao.
- **Thị giác hiện đại**: Dark-mode, tối giản, dễ nhìn.
- **Bám trọng tâm**: Tiếp nhận → Xử lý → Theo dõi → Tài chính → Lưu trữ, mỗi bước đều hữu dụng.
- **Khả năng mở rộng**: Để sẵn đường cho tích hợp AI, kết nối dịch vụ bên ngoài.

---

## 二、Vai trò & kịch bản điển hình

### 2.1 Vai trò

| Vai trò | Quyền điển hình | Số lượng |
|---|---|---|
| `ADMIN` | Toàn quyền, quản lý user, audit, xuất dữ liệu | 1–2 |
| `OWNER` (chủ sở hữu / trưởng văn phòng) | Thấy mọi dự án, phân công, phê duyệt | 1–5 |
| `MANAGER` (quản lý nhóm) | Dự án nhóm mình, duyệt đơn, phân công | — |
| `STAFF` (nhân viên / luật sư) | Dự án được gán; xem được tài chính phạm vi mình | 3–20 |
| `ASSISTANT` (trợ lý) | Theo quyền thành viên dự án | 1–10 |
| `FINANCE` (kế toán) | Mọi trường tài chính; chỉ đọc nội dung dự án | 1–2 |

**Nguyên tắc quyền hạn**:
- Vai trò quản lý (ADMIN/OWNER/MANAGER) không "đọc được mọi dữ án" chỉ vì là quản lý — vẫn giới hạn theo membership dự án cho các thao tác nghiệp vụ.
- Khi tạo "đơn nghiệp vụ" liên quan dự án (mở đường liên kết thủ công, khởi tạo bản ghi tích hợp), chỉ được chọn dự án do mình **chủ trì** (owner / LEAD) hoặc **tham gia** (CO_LEAD / ASSISTANT).
- Dự án có do mình tạo ra **không** đồng nghĩa có quyền quản lý.

### 2.2 Kịch bản điển hình

**A — Từ yêu cầu đến tiếp nhận**
> Khách hàng gọi tới. Người dùng mở "Tạo mới tiếp nhận" → nhập khách hàng, bên liên quan, loại dự án, nội dung.
> Hệ thống tự đối chiếu rủi ro đối tác; nếu có cảnh báo, ghi lại kết luận → tiếp nhận thành dự án chính thức hoặc từ chối.

**B — Chuẩn bị "ra mắt" (tương đương mở phiên)**
> Mở chi tiết dự án → thấy "Hạn sắp tới", chuyển sang tab "Tài liệu" tải tài liệu bổ sung, ghi nhận "Giao tiếp", đánh dấu "Nhiệm vụ" hoàn tất.

**C — Báo cáo tháng**
> Sang mục "Tài chính" → lọc theo "người phụ trách = tôi", thấy kỳ này phải thu / đã thu → xuất bảng đối chiếu PDF.

**D — Kết thúc & lưu trữ**
> Dự án xong → chuyển trạng thái "Đã kết thúc", nhập "Tóm tắt kết thúc", kiểm tra "Danh mục lưu trữ", chốt "Lưu trữ" → chuyển sang chỉ đọc.

---

## 三、Phạm vi chức năng V1

### M1 — Bảng làm việc `/`
- 4 thẻ tổng quan: Dự án đang chạy / Chờ xác nhận / Hạn trong 7 ngày / Thu nhập kỳ.
- Luồng dự án theo giai đoạn.
- Danh sách "Lịch sắp tới" + "Việc cần xử lý".

### M2 — Tiếp nhận `/intakes` (Lead)
- Danh sách + chi tiết; trạng thái: `TIẾP_NHẬN / CHỜ_XÁC_NHẬN / ĐÃ_CHUYỂN / TỪ_CHỐI / CẦN_BỔ_SUNG`.
- Form động theo **loại hình** (ví dụ: tư vấn / thiết kế / kế toán / thương mại / chăm sóc…).
- Trường chính: khách hàng (nhiều), bên liên quan (đối tác / bên thứ 3), người liên hệ + điện thoại, loại giai đoạn, cơ quan/địa điểm xử lý, giá trị hợp đồng, phí (5 chế độ), người chủ trì + cộng tác.
- Upload hợp đồng/ủy quyền (mã hóa).
- Thao tác: Đánh giá rủi ro → Chuyển thành dự án / Từ chối.

### M3 — Đánh giá rủi ro đối tác `/conflicts` (từ "Conflict check")
- So khớp tên / mã số thuế / định danh (chính xác + mờ).
- Phân cấp mức độ: `THẤP / TRUNG_BÌNH / CAO / CHẶN`.
- Kết luận: cùng chủ thể / khác chủ thể / cần thông tin.

### M4 — Quản lý dự án `/matters` (từ "Matter")
- 3 tab: Chờ phê duyệt / Đang chạy / Đã kết thúc–lưu trữ.
- Mã nội bộ tự động.
- Đa giai đoạn nối tiếp (`ProjectStage` / `MatterProcedure`), tự do chọn giai đoạn bắt đầu, có thể bổ sung giai đoạn tham khảo (`INFORMATIONAL`).
- Chi tiết: Tổng quan / Nhiệm vụ / Hạn & Lịch / Giao tiếp / Tài liệu / Tài chính / Dòng thời gian.

### M5 — Khách hàng & liên hệ `/clients`, `/contacts`
- Khách hàng (cá nhân / tổ chức), người liên hệ, hồ sơ gộp: dự án liên quan, tổng doanh thu, mốc hợp tác.

### M6 — Tài chính `/finance`
- Hợp đồng (`Billing`), thu chi (`FeeEntry`), phân chia doanh thu (`CommissionPlan`).
- Yêu cầu xuất hóa đơn (`InvoiceRequest`): người tạo → kế toán duyệt → upload hóa đơn điện tử.
- Biểu đồ doanh thu, phân loại, top khách hàng.

### M7 — Lịch làm việc `/schedule`
- Lịch tháng + danh sách; gộp Hẹn + Hạn + Nhiệm vụ; nhắc trước N ngày.

### M8 — Tài liệu `/documents` (trong chi tiết dự án)
- Phân loại: BẰNG_CHỨNG / VĂN_BẢN / THỦ_TỤC / PHÁN_QUYẾT / HỢP_ĐỒNG / KHÁC.
- Phiên bản, mã hóa tùy chọn, tải qua API có token.

### M9 — Lưu trữ `/archive`
- Tóm tắt kết thúc → kiểm tra đầy đủ → khóa chỉ đọc → xuất ZIP.

### M10 — Cài đặt `/settings`
- Quản lý user + vai trò, chỉnh mẫu giai đoạn, bật/tắt luật đánh giá rủi ro, xem audit log, xuất/sao lưu dữ liệu.

---

## 四、Các module mở rộng đã có (trong schema & UI)

| Module | Đường dẫn | Mô tả |
|---|---|---|
| **Hộp thư tin nhắn SMS /inbox** | `(app)/inbox`, `(app)/sms` | Dán tin nhắn → tự phân tích (mã án / ngày / tòa…) → khớp dự án → tạo Hạn hoặc Hẹn |
| **Bảo toàn tài sản /preservation** | `(app)/preservation`, `(app)/preservations` | 3 tầng (Vụ → Đối tượng → Tài sản), cảnh báo hết hạn, gia hạn |
| **Theo dõi chuyển phát /express** | `(app)/express` | Theo dõi đơn gửi/nhận, liên kết dự án |
| **Quản lý công việc nội bộ /erp** | `(app)/erp/tasks`, `(app)/erp/projects` | Task, dự án, kanban, workflow |
| **Gia phả /genealogy** | `(app)/genealogy/…` | Person, quan hệ, sự kiện, dòng họ (kế thừa/migration) |
| **Tư liệu công ty /firm-resources** | `(app)/firm-resources` | Quy chế, hướng dẫn, mẫu, chứng chỉ |
| **Thông báo /announcements** | `(app)/announcements` | Thông báo nội bộ, banner |
| **Liên hệ ngoài /contacts** | `(app)/contacts` | Liên hệ bên ngoài + duyệt trước khi hiển thị |
| **Đánh giá AI /settings/ai** | `(app)/settings/ai` | Lịch sử kiểm tra văn bản bằng AI |
| **Trường tùy chỉnh /settings/custom-fields** | — | Trường động cho Dự án / Khách hàng |
| **Báo cáo /reports** | `(app)/reports` | Xuất báo cáo, đa sheet Excel |
| **Phê duyệt dùng con dấu /seals** | `(app)/seals`, `(app)/approvals/seals` | Phê duyệt đóng dấu (5 loại), quy trình đầy đủ |
| **Mẫu tài liệu & Tài liệu mẫu** | `settings/templates` | Sinh tài liệu từ template, lưu vào dự án |

---

### Các module mới — Giai đoạn 1 (P0, 2026-10)

| Module | Đường dẫn | Mô tả | Task |
|---|---|---|---|
| **Pipeline tiếp nhận** | `(app)/intakes` | Tiếp nhận dạng kanban theo giai đoạn, gán phụ trách, SLA chờ xử lý, lý do thắng/thua khi đóng | TD-A1/A2 |
| **Báo giá (Quote)** | `(app)/quotes`, `(app)/quotes/[id]` | Báo giá gửi khách: dòng hàng mục, chiết khấu/thuế, in PDF, hết hạn; chuyển thành hợp đồng/dự án | TD-A3 |
| **Hợp đồng (Contract)** | `(app)/contracts`, `(app)/contracts/[id]` | Vòng đời nháp→review→ký→hiệu lực→gia hạn→hết hạn, nghĩa vụ, nhắc gia hạn, liên kết khách hàng/dự án | TD-A4 |
| **Ghi giờ (Timesheet)** | `(app)/time-tracking` | Ghi giờ theo dự án/nhiệm vụ, billable vs nội bộ, duyệt, tổng hợp chi phí nhân công | TD-B1 |
| **Chi phí (Expense)** | `(app)/expenses` | Phiếu chi/đề nghị thanh toán, duyệt, gắn dự án, chứng từ | TD-C5 |
| **Quỹ & công nợ** | `(app)/finance` | Tài khoản quỹ (tiền mặt/ngân hàng/ví), tuổi nợ, nhắc nợ, phân bổ thu | TD-C1/C2 |
| **Email giao dịch** | `settings/email` + `lib/email` | SMTP gửi mail: xác thực tài khoản, mời user, nhắc hạn, reset mật khẩu; biến môi trường cấu hình | TD-F1 |
| **Thuật ngữ cấu hình** | `settings/terminology` | Đổi nhãn hiển thị (Matter→Dự án/Vụ/Đơn hàng…) theo triển khai, nền schema giữ nguyên | TD-G1 |

### Các module mới — Giai đoạn 2 (P1) — bắt đầu 2026-10

| Module | Đường dẫn | Mô tả | Task |
|---|---|---|---|
| **Nghỉ phép** | `(app)/leave` | Xin phép→duyệt; loại phép, số ngày, ngưỡng phép năm trong `SystemSetting.leave`; số dư phép tính tại chỗ | TD-D2 |

---

## 五、Lộ trình V1.5 (sau khi lên V1 2–3 tháng)

| Hạng mục | Ghi chú |
|---|---|
| Tích hợp MCP mở | Đánh giá rủi ro đối tác tự động; điền sẵn thông tin doanh nghiệp |
| Tóm tắt AI | Tóm tắt tài liệu khi upload |
| Thư viện mẫu | Liên kết mẫu với giai đoạn |
| Thông báo email/Zalo | Nhắc hạn, nhắc tiếp nhận chờ xử lý |
| Di động | Responsive, không làm native |

## 六、Tầm nhìn V2 (6+ tháng)

- Tìm kiếm ngữ nghĩa (đề xuất dự án tương tự).
- Phân tích thời gian (thống kê năng suất).
- Cổng khách hàng (khách đăng nhập xem tiến độ).
- Chế độ đa tổ chức (chỉ nếu thực sự có nhu cầu).

---

## 七、Yêu cầu phi chức năng

| Khía cạnh | Yêu cầu |
|---|---|
| Hiệu năng | Danh sách 1000 mục < 500ms; đối chiếu rủi ro (10000 bản ghi) < 1.5s |
| Trình duyệt | Chrome / Edge / Safari 2 bản gần nhất; không hỗ trợ IE |
| Triển khai | `docker compose up`; không phụ thuộc dịch vụ đám mây |
| Sao lưu | Script `pg_dump` (cron) |
| Ngôn ngữ | V1 tiếng Việt + song ngữ Anh/Việt; dự trữ cấu trúc i18n |
| Khả năng tiếp cận | WCAG AA |
| Bảo mật | Mật khẩu bcrypt; session JWT; token tải xuống ngắn hạn |

## 八、Nguyên tắc thiết kế

1. **Không nhồi nhét chức năng.** Mỗi lần thêm trường/công tắc, hỏi "người dùng có thật cần?".
2. **Thao tác then chốt ≤ 2 click.**
3. **Từ vấn đề suy ra cách tương tác**, không copy menu của phần mềm khác.
4. **Dark-mode ưu tiên + khoảng trống rộng.**
5. **Lỗi thân thiện**: thông báo cụ thể tới trường, không toast chung chung.
6. **Dữ liệu mang đi được**: mọi danh sách / chi tiết / báo cáo tài chính đều xuất được CSV/PDF.

---

## 九、Quyết định đã khóa

| # | Quyết định | Nơi thực thi |
|---|---|---|
| 1 | Mã nội bộ tự sinh `LL-{YEAR}-{LOẠI}-{4 số}` | DATA-MODEL §五 |
| 2 | Lấy dự án làm trung tâm, không gộp khách hàng | DATA-MODEL §4.2 |
| 3 | Phân biệt vai trò thành viên dự án (chủ trì / cộng tác / trợ lý) | DATA-MODEL §4.4 |
| 4 | Phân chia doanh thu tích hợp sẵn | DATA-MODEL §4.11 |
| 5 | Một dự án đa khách hàng, đa bên liên quan, thêm/bớt tự do | DATA-MODEL §4.4/§4.6 |
| 6 | Đa giai đoạn nối tiếp; tự do chọn giai đoạn bắt đầu | DATA-MODEL §4.5 |
| 7 | Mã hóa tài liệu tùy chọn (AES-256-GCM) | DATA-MODEL §4.10 |
| 8 | Không làm công cụ di trữ dữ liệu ở V1 | — |
| 9 | Dark-mode mặc định + màu nhấn chỉnh được ở Cài đặt | UI-DESIGN §二 |
| 10 | Tạo mới dùng ngăn kéo phải; xem/sửa dùng trang đầy đủ | UI-DESIGN §六 |
| 11 | Giấy phép MIT | LICENSE / package.json |
| 12 | Phân loại theo lĩnh vực (không chỉ 3 loại tố tụng) | DATA-MODEL §4.3 |
| 13 | Cơ quan xử lý là trường độc lập | DATA-MODEL §4.5 |
| 14 | Thu hẹp menu cấp 1: Bảng làm việc / Dự án / Khách hàng / Tài chính / Lịch / Cài đặt | Điều hướng |
| 15 | Form tiếp nhận khái quát (tự do nhập + tự tạo khách hàng; tiêu đề có thể trống; upload hợp đồng) | §10.2 |
| 16 | Quy trình phê duyệt tiếp nhận (OWNER/ADMIN duyệt; kiểm tra quyền ở server) | §10.3 |
| 17 | Đánh giá rủi ro từ thanh trên + hộp thoại | §10.4 |
| 18 | Chuyển đổi chủ đề sáng/tối (next-themes) | UI-DESIGN §二 |
| 19 | Báo giá–hợp đồng là bước trung gian khuyến khích, không chặn tạo dự án từ tiếp nhận | PRD §3.b / TODO.md GĐ1 |
| 20 | Mã nội bộ module mới: `QT-{NĂM}-{NNNN}` báo giá, `CT-{NĂM}-{NNNN}` hợp đồng, `EXP-{NĂM}-{NNNN}` chi phí (đếm qua `SystemSetting`) | DATA-MODEL §五 |
| 21 | Email giao dịch chỉ đi qua SMTP cấu hình bằng biến môi trường; không hard-code thông tin đăng nhập | PRD §3.b |
| 22 | Thuật ngữ hiển thị cấu hình được qua `SystemSetting.terminology`; schema/model Prisma giữ nguyên tên gốc | PRD §三

---

## 十、Quy trình nghiệp vụ trọng tâm

### 10.1 Luồng tiếp nhận → dự án
```
[Bất kỳ vai trò] Gửi tiếp nhận
  ↓ status = CHỜ_XÁC_NHẬN
[OWNER / ADMIN thao tác được]
  ├─ Chuyển thành dự án → tạo Dự án (migrate tài liệu) → TIẾP_NHẬN.status = ĐÃ_CHUYỂN
  └─ Từ chối → status = TỪ_CHỐI + ghi lý do
```
- Kiểm tra quyền ở **server action**, không chỉ ẩn UI.
- Hợp đồng: Document ở Intake chuyển sang Matter khi convert (giữ liên kết ngược Intake).

### 10.2 Yêu cầu hóa đơn (InvoiceRequest)
```
[Chủ trì/Thành viên] Vào "Tài chính" của dự án → "Yêu cầu hóa đơn"
  ↓ nhập số tiền + đầu đề + đính kèm + ghi chú → status = CHỜ_XỬ_LÝ
[FINANCE / ADMIN / OWNER] ở /finance tab "Quản lý hóa đơn"
  ├─ Từ chối → ghi lý do → status = TỪ_CHỐI
  └─ Xử lý → xem thông tin + đính kèm → phê duyệt hoặc tải hóa đơn điện tử
     ├─ Chỉ phê duyệt → status = ĐÃ_DUYỆT
     └─ Có hóa đơn điện tử → nhận diện (OCR) → status = ĐÃ_XUẤT
```

### 10.3 Chỉnh đội ngũ dự án
`updateMatterTeam` — Quyền: ADMIN / OWNER / chủ trì hiện tại. Ghi đè toàn bộ MatterMember (chủ trì + cộng tác + trợ lý).

### 10.4 Luồng báo giá → hợp đồng → dự án (mới, GĐ1)
```
[Tiếp nhận/Lead] chọn "Lập báo giá"
  ↓ tạo Quote (DRAFT) + dòng hàng mục → tính subtotal/chiết khấu/thuế/total
[Sẵn sàng gửi] → status SENT (ghi issuedAt, expiresAt = issuedAt + validDays)
  ├─ Khách đồng ý → status ACCEPTED → "Tạo hợp đồng" (copy dữ liệu) hoặc "Tạo dự án"
  ├─ Khách từ chối → REJECTED + lý do
  └─ Quá expiresAt → EXPIRED (cron/đọc theo thời gian)
[Hợp đồng] nháp → review → SIGNED (signedAt) → ACTIVE (effectiveAt) → EXPIRED (expiresAt) hoặc TERMINATED
  ↓ nhắc gia hạn trước N ngày (renewRemindDays)
[Dự án] tạo từ hợp đồng: liên kết matterId, giá trị mặc định = Contract.amount
```
Kiểm tra quyền ở server action (ADMIN/OWNER/MANAGER tạo-duyệt; STAFF tạo nháp).

---

### 10.5 Luồng nghỉ phép (mới, GĐ2)
```
[STAFF/…] Tạo đơn nghỉ phép (/leave) → status = SUBMITTED (hoặc DRAFT rồi gửi)
[OWNER / ADMIN / MANAGER] trang “Chờ duyệt”
  ├─ Từ chối → status = REJECTED + lý do
  └─ Duyệt  → status = APPROVED (ghi approver + decidedAt)
[Người xin] Rút đơn khi còn SUBMITTED → status = CANCELLED
```
- Số dư phép = ngưỡng năm (`SystemSetting.leave`) − Σ ngày APPROVED/đang SUBMITTED trong năm; không lưu số dư (DATA-MODEL §4.33).
- Kiểm tra quyền ở **server action**, không chỉ ẩn UI.

## 十一、Lưu ý khi khái quát hóa

1. **Loại hình dự án động**: cho phép admin tự định nghĩa loại hình (dịch vụ / thương mại / sản xuất…) thay vì hard-code enum pháp lý.
2. **Đa tổ chức (tùy chọn V2)**: nếu làm SaaS cho nhiều công ty, cần `organizationId` trên mọi bảng + cách ly dữ liệu — hiện **không** làm.
3. **Mẫu ngành**: khi cài đặt, cho chọn loại hình doanh nghiệp để bật/tắt module phù hợp.
4. **Thuật ngữ chuyển đổi**: tầng UI đổi Matter→Dự án, Client→Khách hàng…; tầng schema/Prisma có thể giữ model gốc (ghi chú ánh xạ trong DATA-MODEL).

---

*Tài liệu này được viết lại bằng tiếng Việt theo định hướng khái quát hóa, bám sát nội dung PRD gốc và các quyết định đã khóa. Khi yêu cầu thay đổi, hãy sửa tài liệu này + AGENTS.md trước, rồi mới sửa code.*
