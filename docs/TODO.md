# 🗺️ KẾ HOẠCH PHÁT TRIỂN TOÀN DIỆN — Hệ điều hành cho công ty nhỏ / văn phòng độc lập

**Mục tiêu**: Trừ "công cụ quản lý vụ án" thành **hệ điều hành quản trị** cho mọi công ty nhỏ, văn phòng dịch vụ độc lập (tư vấn, thiết kế, kế toán, marketing, thương mại nhỏ…): tiếp nhận → báo giá/hợp đồng → điều phối → theo dõi tiến độ → ghi chép tài chính → lưu trữ → xuất dữ liệu.
**Bối cảnh**: Luồng nghiệp vụ V1 đã chạy; nền tảng (auth, RBAC, audit, storage, notification, workflow, seeder) đã có. Thiếu toàn bộ mảng thương mại – tài chính sâu – vận hành nội bộ – cổng khách hàng – tích hợp.
**Cách dùng**: mỗi task có ID `TD-<domain><số>`, ưu tiên P0→P3, công lượng ngày-dev. Khi làm 1 task: sửa PRD/DATA-MODEL trước (§5.1 AGENTS.md), rồi Data→Types→Server Action→UI→Test.
**Cập nhật lần cuối**: 2026-10-24 (AUTO-38).

---

## Mục lục

1. Trạng thái thực tế (đã có gì)
2. Domain map & mảng trống
3. Danh sách task toàn diện (A→H)
4. Lộ trình theo giai đoạn (rà sequencing)
5. Tiêu chí "full" cho công ty nhỏ / văn phòng độc lập
6. Phụ lục: kế hoạch di trú cũ (lịch sử, đã hoàn thành pha 0–6)

---

## 1. Trạng thái thực tế (đã có, 2026-10-24)

**Đã có và chạy** (schema + server action + UI):

| Mảng | Thành phần |
|---|---|
| Danh tính & phân quyền | NextAuth credentials, vai trò ADMIN/OWNER/MANAGER/STAFF/FINANCE, AuditLog, Team/TeamMember |
| Tiếp nhận & điều phối | `/intakes` (SMS parse, AI đánh giá, convert→Matter), conflicts check |
| Quản lý dự án/vụ | `/matters` đầy đủ: stage, procedure, party, deadline, hearing, document folder, member, custom fields |
| Khách hàng | `/clients`, `/contacts` (internal + external contact + duyệt), ExternalContact |
| Công việc nội bộ | `/erp` tasks/projects/board, WorkTask, workflow engine, checklist, watcher, comment, milestone |
| Tài chính | `/finance` FeeEntry (thu/chi), InvoiceRequest/Billing, CommissionPlan, reports export |
| Tài liệu | document, folder, template, template engine, AI check, OCR flag |
| Lưu trữ | `/archive` (duyệt 2 cấp) |
| Lịch & nhắc | `/schedule`, Deadline, reminders, cron, `lib/ics.ts` (iCal export) |
| Thông báo | in-app Notification + Announcement |
| Báo cáo | `/reports` multi-sheet Excel |
| Hạ tầng | Docker Compose app+postgres, Prisma migration, storage local (AES tuỳ chọn), rate-limit, telemetry cơ bản, `/api/health` |
| Dọc ngành (giữ lại tuỳ chọn) | seals (phê duyệt con dấu), preservation (bảo toàn tài sản), express (chuyển phát), causes of action, genealogy (gia phả) |

**Chưa có / thiếu nghiêm trọng** (chi tiết task ở mục 3): CRM bán hàng, báo giá–hợp đồng, kế toán sổ sách, timesheet, công nợ nâng cao, HR (nghỉ phép, chấm công, hồ sơ NV), mua sắm–tài sản–subscription, cổng khách hàng, email/Zalo/chat, tích hợp (hóa đơn điện tử, cổng thanh toán, kế toán MISA/Fast), API/webhook công khai, import/export dữ liệu đại trà, SSO/2FA, i18n/đa tiền tệ, PWA, E2E test, phân tích/BI, automation engine, đa chi nhánh.

---

## 2. Domain map & mảng trống

```
[Thương mại]   Lead/Opportunity ▸ Báo giá ▸ Hợp đồng ▸ Dự án ▸ Nghiệm thu ▸ Xuất hoá đơn ▸ Thu tiền
   có: ░░Lead(intake)░░░░░░░░Dự án░░░░░FeeEntry░░InvoiceRequest░░  ▸ thiếu: pipeline, quote, contract, đối soát, nhắc nợ
[Vận hành]     Điều phối ▸ Task/Board ▸ Deadline ▸ Tài liệu ▸ Bàn giao ▸ Lưu trữ
   có: ████████████████████████████████████████████████████  ▸ thiếu: timesheet, capacity, template dự án
[Tài chính]    Sổ quỹ ▸ Công nợ ▸ Chi phí ▸ Báo cáo tài chính
   có: ████████████  ▸ thiếu: kế toán tổng hợp, hóa đơn GTGT, chi phí dự án, ngân hàng đối soát
[Nội bộ]       Nhân sự ▸ Duyệt ▸ Mua sắm ▸ Tài sản ▸ Subscription
   có: ██ (user/team)  ▸ thiếu: gần như toàn bộ
[Khách hàng]   Portal ▸ Tự phục vụ ▸ Ticket ▸ Thanh toán
   có: ░░░░░░░░░░░░░░  ▸ thiếu: gần như toàn bộ
[Tích hợp]     Email/Zalo/Chat ▸ HDDT ▸ Payment ▸ Kế toán ▸ Calendar ▸ API/Webhook
   có: ░░░░░░░░░░░░░░  ▸ thiếu: gần như toàn bộ
```

---

## 3. Danh sách task toàn diện

### Nhóm A — Thương mại & Khách hàng (CRM/Quote/Contract)

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-A1 | Bảng điều khiển Lead: kanban giai đoạn, nguồn lead, gán người phụ trách, SLA chờ xử lý | P0 | 5d |
| TD-A2 | Máy trạng thái Lead→Project: trạng thái thân thiện (thành công/thất bại/lý do), chuyển đổi giữ liệu | P0 | 3d |
| TD-A3 | Module Báo giá (Quote): bản nháp/phê duyệt/gửi, version, PDF, hết hạn, chuyển Quote→Contract→Project | P0 | 7d |
| TD-A4 | Module Hợp đồng (Contract): vòng đợi (nháp→review→ký→hiệu lực→gia hạn→hết hạn), điều khoản/nghĩa vụ, nhắc gia hạn | P0 | 7d |
| TD-A5 | Khách hàng 360: timeline mọi tương tác (call/email/họp/phiếu), ticket/phiếu yêu cầu, điểm hài lòng (CSAT/NPS) | P1 | 5d |
| TD-A6 | Đối tác/Nhà cung cấp (Party) cho thương mại: hợp đồng mua, điều khoản thanh toán, đánh giá | P1 | 4d |
| TD-A7 | Marketing lite: chiến dịch, nguồn giới thiệu (UTM/referral), báo cáo chuyển đổi theo kênh | P2 | 4d |
| TD-A8 | Email hai chiều: gửi từ app, đồng bộ hộp thư (IMAP), tự động gắn vào khách hàng/dự án | P1 | 8d |

### Nhóm B — Vận hành & Dự án (Sản xuất dịch vụ)

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-B1 | Timesheet/time-tracking: ghi giờ theo task/dự án, billable vs nội bộ, duyệt, tổng hợp chi phí nhân công | P0 | 6d |
| TD-B2 | Ngân sách dự án: ngân sách giờ/chi phí, cảnh báo vượt, so sánh thực tế–kế hoạch | P1 | 4d |
| TD-B3 | Gantt + phụ thuộc công việc (predecessor), critical path nhẹ | P1 | 5d |
| TD-B4 | Template dự án: sinh dự án từ mẫu (giai đoạn, task, tài liệu, checklist theo ngành) | P1 | 4d |
| TD-B5 | Khối lượng công việc/capacity view: ai làm gì tuần tới, quá tải | P2 | 4d |
| TD-B6 | Quy trình duyệt đa cấp gói thác (expense, mua sắm, nghỉ phép, seal…): engine cấu hình được (bước, người duyệt, điều kiện) | P1 | 7d |
| TD-B7 | Nghiệm thu/bàn giao: checklist nghiệm thu, sinh biên bản, chốt phí | P2 | 4d |
| TD-B8 | Tự động hoá (automation rules): khi X thì Y (tạo task, gửi thông báo, đổi trạng thái, nhắc hạn) — scheduler + builder luật | P2 | 8d |

### Nhóm C — Tài chính & Kế toán (mảng trống lớn nhất)

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-C1 | Sổ quỹ + thu chi nâng cao: phương thức thanh toán, tài khoản quỹ, dự toán chi, đối chiếu | P0 | 5d |
| TD-C2 | Công nợ: tuổi nợ (aging), nhắc nợ tự động (email/Zalo), phân bổ thu theo hoá đơn | P0 | 5d |
| TD-C3 | Hệ thống tài khoản + bút toán kép (chart of accounts, journal, ledger, trial balance) | P1 | 8d |
| TD-C4 | Báo cáo tài chính: Bảng cân đối kế toán, KQKD, LCTT theo chuẩn VN (TT200 hoặc VAS) | P1 | 6d |
| TD-C5 | Chi phí/đề nghị tạm ứng: phiếu chi, đề nghị thanh toán, duyệt đa cấp, gắn dự án | P0 | 5d |
| TD-C6 | Hóa đơn điện tử (Viettel/VNPT): phát hành từ Billing, ký số, tra cứu, hủy | P1 | 7d |
| TD-C7 | Cổng thanh toán (VNPay/MoMo/ZaloPay/chuyển khoản QR): khách tự thanh toán hoá đơn trên portal | P2 | 6d |
| TD-C8 | Đối soát ngân hàng: import sao kê, khớp tự động/khớp tay | P2 | 5d |
| TD-C9 | Kế nối phần mềm kế toán (MISA/Fast): export bút toán, import số dư | P2 | 5d |
| TD-C10 | Thuế: VAT đầu ra/vào, GTGT, khấu trừ, tờ khai tóm tắt; đa tiền tệ (nếu có khách nước ngoài) | P2 | 5d |

### Nhóm D — Nội bộ, Nhân sự & Mua sắm

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-D1 | Hồ sơ nhân viên: hợp đồng lao động, chứng chỉ (hết hạn cảnh báo), phụ cấp, hợp đồng scan | P1 | 5d |
| TD-D2 | Nghỉ phép: đăng ký, duyệt, số dư phép, lịch nghỉ chung | P1 | 5d |
| TD-D3 | Chấm công: check-in/out (web+geolocation optional), bảng công tháng, xuất Excel | P2 | 5d |
| TD-D4 | Sơ đồ tổ chức (org chart) | P2 | 2d |
| TD-D5 | Mua sắm: đề nghị mua → duyệt → đặt hàng → nhận → thanh toán, nhà cung cấp | P1 | 6d |
| TD-D6 | Tài sản & Subscription: sổ tài sản (khấu hao), theo dõi license SaaS/domain/hosting, nhắc gia hạn | P1 | 5d |
| TD-D7 | KPI/mục tiêu nhân viên lite (OKR/KPI theo kỳ) | P3 | 4d |
| TD-D8 | Helpdesk nội bộ (ticket giữa các phòng ban) | P3 | 4d |

### Nhóm E — Cổng khách hàng & Tự phục vụ

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-E1 | Cổng khách hàng (client login): xem tiến độ dự án, tài liệu được chia sẻ, phiếu yêu cầu, tin nhắn | P1 | 8d |
| TD-E2 | Khách xem/thanh toán hoá đơn trên portal (xem PDF, thanh toán — cần TD-C7) | P2 | 4d |
| TD-E3 | Nộp tài liệu/tải lên từ portal (link có hạn, không cần tài khoản) | P1 | 3d |
| TD-E4 | CSAT/NPS sau nghiệm thu | P3 | 2d |

### Nhóm F — Truyền thông & Tích hợp

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-F1 | Email giao dịch (SMTP): xác thực, mời user, nhắc hạn, reset mật khẩu, template HTML | P0 | 3d |
| TD-F2 | Zalo OA: gửi thông báo/nhắc hạn cho khách (nội bộ dùng Zalo ZCA nếu được) | P1 | 5d |
| TD-F3 | Chat nội bộ (thread theo dự án) hoặc tích hợp Slack/Teams/Telegram | P2 | 6d |
| TD-F4 | Google/Outlook Calendar hai chiều (Deadline/Hearing/Task) | P2 | 5d |
| TD-F5 | Web push (PWA) cho thông báo | P2 | 3d |
| TD-F6 | API công khai + webhook (REST/GraphQL, key scoped, retry, chữ ký HMAC) cho tích hợp bên ngoài | P2 | 8d |
| TD-F7 | MCP server (AGENTS §2 "Dự trữ V1.5"): expose tool cho AI agent bên ngoài | P3 | 6d |

### Nhóm G — Nền tảng, Bảo mật, Tuân thủ

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-G1 | Thuật ngữ cấu hình được (Matter→Dự án/Vụ/Công việc/Đơn hàng): bảng ánh xạ UI theo triển khai | P0 | 4d |
| TD-G2 | Thương hiệu hoá triển khai (logo, màu, tên app, tên miền, favicon) cho mỗi công ty cài đặt | P1 | 2d |
| TD-G3 | 2FA/TOTP + chính sách mật khẩu + quản lý phiên (thu hồi, danh sách thiết bị) | P1 | 5d |
| TD-G4 | SSO (Google/Microsoft) + LDAP/AD (nếu công ty có) | P2 | 6d |
| TD-G5 | Đa chi nhánh/phòng ban (đúng 1 công ty, nhiều văn phòng): phân quyền theo chi nhánh, báo cáo gộp | P2 | 8d |
| TD-G6 | Xuất dữ liệu tự phục vụ: backup toàn bộ (JSON/SQL), export theo module, retention & xoá ẩn danh (GDPR export/erasure) | P1 | 5d |
| TD-G7 | Import dữ liệu: wizard CSV/XLSX cho Client/Contact/Project/Task/Finance; migrate từ Excel cũ | P1 | 6d |
| TD-G8 | i18n (vi/en…), đa tiền tệ, timezone, định dạng ngày/số theo locale | P2 | 5d |
| TD-G9 | PWA: offline nhẹ, cài về màn hình, push; kiểm toán responsive mobile | P1 | 5d |
| TD-G10 | Quan sát: log JSON có cấu trúc + correlation id, metrics Prometheus, alert, health chi tiết (db/cache/queue) | P1 | 5d |
| TD-G11 | Resilience: timeout toàn I/O, circuit breaker tối thiểu, retry có jitter cho tích hợp ngoài | P2 | 5d |
| TD-G12 | Hiệu năng: rà only mục lục DB cho cột lọc/sắp xếp, phân trang mọi bảng lớn, cache đọc, xoá N+1 | P1 | 5d |
| TD-G13 | E2E (Playwright): luồng vàng (lead→quote→project→invoice→payment), phủ regression | P1 | 6d |
| TD-G14 | Tích hợp CI: required checks (lint/typecheck/test+coverage≥80%/build/security-scan) trên PR | P1 | 3d |
| TD-G15 | Backup/restore DB theo lịch + restore drill | P1 | 3d |

### Nhóm H — Dọn dẹp & Khái quát hoá (đặc thù dòng ngành)

| ID | Task | Ưu tiên | Công lượng |
|---|---|---|---|
| TD-H1 | Tách "vertical plugin": seals, preservation, express, causes, genealogy → module tuỳ chọn bật/tắt theo triển khai | P1 | 6d |
| TD-H2 | Onboarding wizard cho công ty mới (profile, người dùng, dữ liệu mẫu, luồng gợi ý theo ngành) | P1 | 5d |
| TD-H3 | Trung tâm trợ giúp in-app: hướng dẫn theo vai trò, changelog, form góp ý | P2 | 4d |
| TD-H4 | Analytics nội bộ: KPI công ty (doanh thu, lợi nhuận, công nợ, pipeline), dashboard biểu đồ, xuất | P2 | 6d |
| TD-H5 | Tìm kiếm ngữ nghĩa / đề xuất (dự án tương tự, tài liệu liên quan) bằng embedding (AGENTS V2 nâng lên) | P3 | 8d |

**Tổng công lượng ước lượng**: ~220 ngày-dev (≈ 4–5 tháng 1 dev, hoặc 2–2.5 tháng 2 dev) cho P0+P1; P2+P3 theo nhu cầu triển khai từng công ty.

---

## 4. Lộ trình theo giai đoạn (rà sequencing)

- **Giai đoạn 1 — "Thương mại hoá lõi" (P0, ~4 tuần)**: TD-A1, TD-A2, TD-A3, TD-A4, TD-B1, TD-C1, TD-C2, TD-C5, TD-F1, TD-G1.
  *Mục tiêu: một văn phòng bình thường đi từ khách hàng gọi điện → báo giá → hợp đồng → dự án → thu tiền, đủ dùng hằng ngày.*
- **Giai đoạn 2 — "Hoàn chỉnh vận hành" (P1, ~6 tuần)**: TD-A5, TD-A8, TD-B2, TD-B3, TD-B4, TD-B6, TD-C3, TD-C4, TD-C6, TD-D1, TD-D2, TD-D5, TD-D6, TD-E1, TD-E3, TD-F2, TD-G2, TD-G3, TD-G6, TD-G7, TD-G9, TD-G10, TD-G12, TD-G13, TD-G14, TD-G15, TD-H1, TD-H2.
- **Giai đoạn 3 — "Nâng cao" (P2, ~6 tuần)**: TD-A7, TD-B5, TD-B7, TD-B8, TD-C7, TD-C8, TD-C9, TD-C10, TD-D3, TD-D4, TD-E2, TD-F3, TD-F4, TD-F5, TD-F6, TD-G4, TD-G5, TD-G8, TD-G11, TD-H3, TD-H4.
- **Giai đoạn 4 — "Mở rộng" (P3)**: TD-D7, TD-D8, TD-E4, TD-F7, TD-H5.

**Nguyên tắc ưu tiên khi thay đổi**: vi phạm cổng chất lượng & bảo mật luôn nhảy hàng trước task tính năng (GOAL.md §2.2). Không bắt đầu task mới khi lint/typecheck/test đang đỏ.

---

## 5. Tiêu chí "full" cho công ty nhỏ / văn phòng độc lập

Một triển khai coi là **đủ dùng** khi đạt đồng thời:

1. **Thương mại đóng vòng**: lead → báo giá → hợp đồng → dự án → nghiệm thu → hoá đơn → thu tiền, có nhắc nợ.
2. **Tài chính tự chủ**: sổ quỹ, công nợ, chi phí theo dự án, báo cáo tài chính cơ bản không cần phần mềm ngoài.
3. **Vận hành nhìn được**: ai đang làm gì, tới hạn gì, dự án nào trễ, dự án nào vượt ngân sách (dashboard + cảnh báo).
4. **Nội bộ tự chảy**: duyệt (chi phí, mua sắm, nghỉ phép), hồ sơ nhân viên, tài sản/subscription.
5. **Khách hàng tự phục vụ**: portal xem tiến độ, nộp tài liệu, thanh toán hoá đơn.
6. **Bảo mật & tuân thủ**: 2FA, audit bất biến, backup-restore tự phục vụ, xuất/xoá dữ liệu cá nhân.
7. **Triển khai dễ**: docker compose up → onboarding wizard → import dữ liệu cũ → dùng được trong ngày.
---

# Phụ lục (lịch sử): KẾ HOẠCH DI TRÚ TOÀN DIỆN — gộp client-next + server-nest

> Kế hoạch gộp 3 mã nguồn năm 2025. Pha 0–6 đã hoàn thành (schema hợp nhất ~74 model, server actions đầy đủ, auth NextAuth). Chỉ giữ lại làm tài liệu lịch sử; các hạng mục còn treo (test phủ sâu, deploy) quy về nhóm G ở trên.

**Mục tiêu**: Ứng dụng Next.js hợp nhất (LawLink) gồm miền nghiệp vụ + genealogy + ERP.
**Thời gian**: 11–12 tuần (2.5–3 tháng).
**Đội ngũ**: 1–2 lập trình viên.
**Trạng thái**: Đang làm (UI/FE xong, typecheck pass).
**Cập nhật lần cuối**: 2025-06-26.

---

## Mục lục

1. Tóm tắt điều hành
2. Phân tích trạng thái hiện tại
3. Kiến trúc mục tiêu
4. Tổng quan pha di trú
5. Pha 0: Chuẩn bị
6. Pha 1: Hợp nhất CSDL
7. Pha 2: Chuyển UI components
8. Pha 3: Di trú trang frontend
9. Pha 4: Di trú backend (NestJS → Server Actions)
10. Pha 5: Tích hợp auth
11. Pha 6: Hợp nhất utils dùng chung
12. Pha 7: Chiến lược test
13. Pha 8: Deploy & Hạ tầng
14. Pha 9: Tài liệu
15. Bản đồ tính năng
16. Sổ đăng ký rủi ro
17. Tiêu chí thành công
18. Phân bổ theo tuần (Gantt)

---

## 1. Tóm tắt điều hành

Gộp **3 mã nguồn** thành **1 ứng dụng Next.js hợp nhất**:

| Nguồn | Stack | Miền | Số phận |
|---|---|---|---|
| **LawLink** | Next.js + Prisma + shadcn/ui | Quản lý công việc | **Giữ & mở rộng** |
| **client-next** | Next.js + @base-ui/react | Gia phả / cây gia đình | **Gộp vào LawLink** |
| **server-nest** | NestJS + TypeORM | ERP / Task | **Di trú sang LawLink Server Actions** |

**Kết quả**: Một app Next.js duy nhất (LawLink) với nhiều miền.

**Vì sao**:
- Triển khai & bảo trì một chỗ.
- Chia sẻ hạ tầng (auth, audit, storage, quyền).
- Thư viện UI hợp nhất (shadcn/ui).
- Trải nghiệm dev nhất quán.
- Không tốn chi phí giao tiếp giữa các app.

**Công lượng**: 11–12 tuần với 1–2 dev full-stack senior.

---

## 2. Trạng thái hiện tại (2025-06-26)

### ✅ Hoàn thành (di trú toàn diện)
- Cài phụ thuộc: `html-to-image`, `jspdf`, `@hugeicons/core-free-icons`.
- Kiểu TS: thêm `TaskStatus`, `TaskPriority`, `WorkTask`.
- **Pha 1 – Hợp nhất CSDL (100%)**: gộp schema server-nest; thêm `ProjectMilestone`, `WorkflowAudit`, `File`, `Report`; `prisma db push`; seed sample.
- **Pha 4 – Di trú backend (100%)**: cài server actions cho mọi module server-nest (genealogy, ERP, shared: notification, files, reports, stats, seals, preservation, express, sms, intakes, settings); bỏ dùng API ngoài ở trang genealogy/ERP.
- `npm run build` pass; `npm run dev` chạy được.
- Tạo `docs/HANDOFF.md`; cập nhật `docs/TODO.md`.

### 🔄 Đang làm
- [ ] **Test (Pha 7)**: chưa có unit/e2e.
- [ ] **Deploy (Pha 8)**: Docker/CI-CD chưa chuẩn.
- [ ] **Module tuỳ chọn**: seals/preservation/express/notification UI còn thiếu (không chặn genealogy/ERP lõi).

### 🚫 Chặn
- Không có gì chặn genealogy/ERP lõi.

### Các bước tiếp theo hành động được
Mục tiêu: từ "UI-only + API ngoài" → "Full-stack hợp nhất".

#### 1️⃣ Pha 1: Hợp nhất CSDL (2 tuần)
- Việc:
  - Trích entity server-nest → `migration/database/source-entities/server-nest/`.
  - Chuyển TypeORM → Prisma: thêm enum `Gender/RelationType/EventType/TaskStatus/TaskPriority/ProjectStatus/WorkflowState`; thêm model Person/Relationship/Event/Lineage/WorkTask/Project/ProjectMember/Workflow…; giải xung đột (vd `Task`→`LegalTask`).
  - Thêm liên kết giữa các miền; `npx prisma validate && npx prisma format`.
  - `npx prisma migrate dev --name "unified-schema-genealogy-erp"`; seed sample; test reset DB.
- Sản phẩm: schema hợp nhất (~70–80 model), file migration, ERD.

#### 2️⃣ Pha 4: Di trú backend (3–4 tuần)
- Tạo cấu trúc `src/server/{genealogy,erp,shared}`; cài persons/relationships/events/lineage/tasks/projects/workflow; dùng Zod; gọi prisma; audit + revalidatePath.
- Cập nhật trang gọi server actions thay API ngoài; test end-to-end (tạo person → hiện → sửa → xóa).
- Sản phẩm: mọi feature genealogy/ERP chạy trên backend LawLink.

#### Ưu tiên thấp hơn (tùy thời gian)
- [ ] Bật lại CSV export/import: sửa kiểu Papa rồi gắn lại nút.
- [ ] Test: chuyển từ Jest sang Vitest; unit cho server action; phủ ≥80%.
- [ ] Quan sát: audit log, metrics, tracing.
- [ ] Tài liệu: README, API docs.

## Tiến độ

| Pha | Trạng thái | % |
|---|---|---|
| 0. Chuẩn bị | ✅ | 100% |
| 1. CSDL | ✅ | 100% |
| 2. UI Components | ✅ | 100% |
| 3. Trang frontend | ✅ | 100% |
| 4. Backend | ✅ | 100% |
| 5. Auth | ✅ | 100% |
| 6. Shared Utils | ✅ | 80% |
| 7. Test | ⚠️ | 0% |
| 8. Deploy | ⚠️ | 0% |
| 9. Tài liệu | ✅ | 95% |

**Tổng**: Di trú UI + CSDL + Backend 100% hoàn thành ✅. Test & Deploy còn treo.

## Nhật ký quyết định

- **2025-06-26 — Task dùng `LegalTask` tạm**: `WorkTask` chưa đủ quan hệ; sau khi gộp schema sẽ refactor.
- **2025-06-26 — CSV export tạm tắt**: lỗi kiểu Papa; GEDCOM/JSON đủ MVP; bật lại sau khi sửa kiểu.

---

## 2. Phân tích trạng thái hiện tại

### LawLink (fullstack nghiệp vụ)
- **Frontend**: Next.js 16 App Router; shadcn/ui (Radix) 35+ component; 50+ trang; layout sidebar/topbar/mobile.
- **Backend**: Next.js Server Actions; Prisma + PostgreSQL; NextAuth (credentials). ~80 tệp server action.
- **DB**: ~50 model Prisma.
- **Test**: Vitest (unit lib & server).

### client-next (Frontend genealogy)
- Next.js 16; `@base-ui/react` (25 primitive) → 70+ component tùy chỉnh.
- Trang: dashboard, persons, relationships, lineage, events, settings.
- Không backend (gọi API ngoài); có client API với retry/circuit breaker/cache/correlation id.
- Test: Jest + RTL.

### server-nest (Backend ERP)
- NestJS 11 + TypeORM; PostgreSQL (SQLite dev); Passport JWT.
- Module: persons, relationships, events, lineage, task, project, workflow, notification, files, user, auth.
- BullMQ queue; cron; Sentry + OpenTelemetry; Swagger.
- ~20 entity; controller/service REST; test Jest (phủ ~80%).

## 3. Kiến trúc mục tiêu

```
┌── LawLink (Next.js 16 hợp nhất) ──────────────────────┐
│ FRONTEND (App Router)                                  │
│  src/app/(app)/                                        │
│   ├── legal/        (matters, clients, docs, finance) │
│   ├── genealogy/    (persons, relationships, events)  │  ← từ client-next
│   ├── erp/          (tasks, projects, workflows)      │  ← từ server-nest
│   └── settings/     (hợp nhất)                        │
│  src/components/{ui, layout, domain}                   │
│ BACKEND (Server Actions)  src/server/                  │
│   ├── legal/ genealogy/ erp/ shared/                   │
│   └── shared/{audit, permissions, storage, search…}   │
│ DATABASE (Prisma) prisma/schema.prisma                 │
│   ├── shared: User, AuditLog, File…                    │
│   ├── legal: Matter, Client, Document, Invoice…        │
│   ├── genealogy: Person, Relationship, Event, Lineage  │
│   └── erp: WorkTask, Project, Team, Workflow…          │
│   Tổng ~70–80 model                                    │
│ SHARED LIBS  src/lib/{permissions, storage, utils…}    │
└────────────────────────────────────────────────────────┘
```

**Nguyên tắc**:
- **Single codebase**: chỉ còn LawLink.
- **Single database**: schema Prisma hợp nhất.
- **Single auth**: NextAuth (cookie session).
- **Server actions** thay controller NestJS.
- **shadcn/ui** làm thư viện UI duy nhất.
- **Tách miền**: cấu trúc thư mục rõ theo miền.

## Tổng quan pha

| Pha | Thời gian | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 0 | 3–5 ngày | Audit, kế hoạch, backup, tooling | — |
| 1 | 2 tuần | Gộp schema Prisma | Pha 0 |
| 2 | 2 tuần | base-ui → shadcn + component mới | Pha 0 |
| 3 | 2 tuần | Di trú trang client-next | Pha 2 |
| 4 | 3–4 tuần | NestJS → Server Actions | Pha 1 |
| 5 | 1 tuần | Hợp nhất auth (NextAuth) | Pha 4 |
| 6 | 1 tuần | Hợp nhất utils | Pha 4 |
| 7 | 1 tuần | Chuyển test, phủ ≥80% | Pha 3–6 |
| 8 | 3 ngày | Docker, docker-compose, env | Tất cả |
| 9 | 2 ngày | Tài liệu | Tất cả |
| **Tổng** | **11–12 tuần** | | |

## Các pha (tóm tắt)

- **Pha 0 — Chuẩn bị (3–5 ngày)**: tạo nhánh `migration/unified-app`; thư mục `migration/` (audit/planning/backups); audit components/server-actions/models từ 3 nguồn; lập bảng map component/entity/API; backup bundle; chuẩn bị môi trường dev; tạo nhật ký quyết định.
- **Pha 1 — Hợp nhất CSDL (2 tuần)**: chuyển TypeORM → Prisma theo quy tắc map (`@Entity→model`, `uuid→cuid`, `@Column(type…)→@db…`, `@ManyToOne→relation`, `@Index→@@index`); gộp với model LawLink sẵn có; giải xung đột tên bảng trùng (`Task`, `Notification`, `File`, `User` bằng cách gộp hoặc đổi tên); thêm quan hệ liên miền (Person↔WorkTask, File polymorphic bằng `entityType+entityId`); hợp enum; cập nhật chỉ mục; `migrate dev --create-only` rồi xem SQL trước khi chạy (`AGENTS.md §5.6`); seed sample; tạo ERD.
- **Pha 2 — Chuyển UI Components (2 tuần)**: shadcn đã có sẵn ở LawLink; cài thêm thành phần thiếu; chuyển tier 1 (Button/Input/Card/…) rồi form/overlay/navigation/data; xây các component genealogy riêng (FamilyTree d3/arbor, KinshipFinder, Timeline, GEDCOM Import/Export) và ERP riêng (KanbanBoard dnd-kit, TaskCard, ProjectTimeline, WorkflowDiagram, NotificationCenter); cập nhật toàn bộ import; barrel export.
- **Pha 3 — Di trú trang frontend (2 tuần)**: tạo thư mục `(app)/genealogy`, `(app)/erp`; migrate trang genealogy (persons/relationships/lineage/events/settings); ERP UI xây từ đầu; gộp trang settings; cập nhật sidebar/nav + mobile; test toàn trang.
- **Pha 4 — Di trú backend (3–4 tuần)**: cấu trúc server mới; DTO bằng Zod; viết server actions cho genealogy/ERP/shared; dùng Prisma trực tiếp; audit + `revalidatePath`; đắng transaction cho thao tác nhiều bước; tích hợp Sentry/OpenTelemetry (BullMQ nếu dùng queue); đăng helper `requireAuth/requirePermission`; cài cron job.
- **Pha 5 — Auth (1 tuần)**: chỉ dùng NextAuth; khai báo `authorize`, callback `jwt/session`; hiện tại dùng `/api/login` "Sign in with Credentials"; bỏ Passport JWT/TypeORM của server-nest; mọi server action dùng `getServerSession`; helper `requireAuth/requirePermission`; cập nhật client sang `useSession`.
- **Pha 6 — Hợp nhất Utils (1 tuần)**: gộp permission (server + hook client), storage, utils chung (date/string/validation), hooks (useDebounce/useLocalStorage/useModal/usePermission), kiểu (barrel export từ @prisma/client + kiểu API).
- **Pha 7 — Test (1 tuần)**: audit test hiện có; chuyển Jest → Vitest chủ yếu bằng `vi.mock`; unit test mới, integration, e2e; chức năng chặn: tạo person/task/assign; phủ ≥80%.
- **Pha 8 — Deploy (3 ngày)**: xác nhận Dockerfile/compose; thêm service Redis (nếu BullMQ/cache) và MinIO (nếu S3); cập nhật `.env.example`; test build/start; thêm `/api/health/ready`.
- **Pha 9 — Tài liệu (2 ngày)**: cập nhật README; cập nhật DATA-MODEL kèm ERD; tạo `ARCHITECTURE.md`; tham chiếu API; ghi migration; cập nhật CONTRIBUTING/CHANGELOG.

## Bản đồ tính năng

### Giữ lại miền nghiệp vụ của LawLink
User/Auth, Dashboard, Matters, Clients, Documents, Finance, Conflict check, Archive, Preservation, Causes, Intakes, Seals, Procedures, Express, SMS, AI (Yuandian), Settings, Audit log, File storage, Notifications, Custom fields, Search, Cron.

### Bổ sung từ client-next (Genealogy)
Person/Relationship/FamilyTree/Kinship/GEDCOM Import-Export/Event/Dashboard, Entity (Person/Relationship/Event/Lineage).

### Bổ sung từ server-nest (ERP)
Task/Project/Workflow/Team/Notification/File/Settings, Entity (WorkTask/Project/ProjectMember/Workflow.../Notification/File/Settlement).

## Sổ đăng ký rủi ro

| Rủi ro | Xác suất | Ảnh hưởng | Giảm |
|---|---|---|---|
| Xung đột schema (trùng bảng/trường) | Trung bình | Cao | Rà kỹ hai schema; quy ước đặt tên; giải trước khi di trú |
| Phụ thuộc vòng trong Prisma | Cao | Trung bình | Forward reference (`@relation` name) |
| N+1 trong server action | Trung bình | Cao | `include/select` hợp lý; dataloader nếu cần |
| Bundle phình (3 miền) | Cao | Trung bình | Code splitting theo miền; dynamic import |
| Mất session khi di trú auth | Trung bình | Cao | Test kỹ; fallback; giữ JWT tạm lúc đầu |
| Thiếu BullMQ khi chuyển queue | Trung bình | Trung bình | Cài BullMQ + queue processor |
| Phủ tụt dưới 80% | Cao | Trung bình | Dành thời gian dư ở Pha 7 |
| Breaking khi di trú | Cao | Cao | Feature flag, giữ nhánh, rollback được |
| Bối rối repo nào sửa | Trung bình | Thấp | Chỉ sửa LawLink sau khi di trú bắt đầu |
| Trễ tiến độ | Trung bình | Cao | Buffer 2 tuần; ưu tiên lõi (Pha 1–4) |

## Tiêu chí thành công

✅ **Chức năng**:
- Mọi feature miền nghiệp vụ hoạt động như cũ.
- Mọi feature genealogy (persons/relationships/lineage/events/GEDCOM) chạy.
- Mọi feature ERP (task/project/workflow/notification) chạy.
- Đăng nhập đơn cho mọi miền.

✅ **Kỹ thuật**:
- CSDL: schema hợp nhất 70+ model, đã áp migration.
- Frontend: shadcn/ui, responsive, accessible.
- Backend: toàn bộ server action, không còn code NestJS.
- Test: phủ ≥80%, xanh toàn bộ.
- Bundle: trang đầu < 200KB gzip (có code splitting).
- Hiệu năng: API < 200ms p95.

✅ **Deploy**:
- Một image (`lawlink:unified`).
- `docker compose up` khởi động app+postgres(+redis/minio nếu dùng).
- Health check trả 200.
- Log không lỗi.

✅ **Chất lượng code**:
- Không lỗi kiểu.
- ESLint sạch hoặc chỉ warning.
- Pre-commit hooks.
- Commit theo convention.

✅ **Tài liệu**:
- README (tính năng, quick start, deploy, contributing).
- DATA-MODEL kèm ERD.
- ARCHITECTURE (cấu trúc thư mục + quyết định).
- Tham chiếu API.
- MIGRATION.

## Phân bổ theo tuần (Gantt)

```
Tuần:   0   1   2   3   4   5   6   7   8   9   10  11  12
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pha 0  ████████████████████████████████████████████
Pha 1          ████████████████████████████████████
Pha 2                  ███████████████████████████
Pha 3                          ████████████████████
Pha 4                                  ██████████████████
Pha 5                                              ████████
Pha 6                                                  ████████
Pha 7                                                      ████████
Pha 8                                                          ████
Pha 9                                                            ██
```

- **Tuần 0**: Chuẩn bị (audit, backup, bảng map).
- **Tuần 1–2**: Hợp nhất CSDL.
- **Tuần 3–4**: Chuyển UI component.
- **Tuần 5–6**: Di trú trang frontend.
- **Tuần 7–10**: Di trú backend.
- **Tuần 11**: Hợp nhất auth + utils.
- **Tuần 12**: Test, tài liệu, deploy.

## Kết luận

Kế hoạch này cho lộ trình gộp **client-next** và **server-nest** thành **LawLink**, tạo một ứng dụng hợp nhất với nhiều miền (nghiệp vụ + genealogy + ERP). Tổng công lượng 11–12 tuần với 1–2 dev. Bước tiếp theo: bắt đầu Pha 0 ngay.

## Phụ lục
- Phụ lục A: Kiểm kê toàn bộ tệp.
- Phụ lục B: ERD.
- Phụ lục C: Bảng map component (chi tiết).
- Phụ lục D: Bảng map API (chi tiết).
- Phụ lục E: Báo cáo phủ test.

---

**HẾT KẾ HOẠCH DI TRÚ**
