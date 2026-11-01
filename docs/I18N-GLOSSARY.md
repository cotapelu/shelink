# Bản đồ thuật ngữ Trung → Việt (i18n glossary)

> Dùng cho mọi chu kỳ thay tiếng Trung → tiếng Việt. **Sửa file này TRƯỚC, thêm thuật ngữ mới khi gặp**, rồi mới sửa code (nguyên tắc docs-first §5.1 AGENTS.md).
> Cập nhật: 2026-10-31 (chu kỳ I18N-1).

## Quy tắc phân loại (BẮT BUộc đọc trước khi thay)

| Phân loại | Ví dụ | Xử lý |
|---|---|---|
| 🟢 An toàn | Nhãn UI, thông báo lỗi, toast, placeholder, tên cột bảng | Thay trực tiếp |
| 🟢 An toàn | Comment tiếng Trung trong code | Thay trực tiếp |
| 🟡 Cẩn thận | Chuỗi test đang assert — **phải đổi test cùng lúc với code** (cùng 1 commit) | Đổi đồng bộ |
| 🟡 Cẩn thận | `toLocaleString("zh-CN")` → `"vi-VN"` | Thay + kiểm định ngày |
| 🟡 Cẩn thận | Tên file, tên biến, tên route đã có người dùng đang dùng | ĐỔI TÊN = tạo cycle riêng, ghi rõ trong commit |
| 🔴 Ràng buộc ngoài | `lib/express/companies.ts` — key = tên hãng xe **gửi cho API 快递鸟/快递100** | **GIỮ NGUYÊN**, chỉ ghi chú |
| 🔴 Ràng buộc ngoài | `STATE_TONE` keys (已签收/在途…) — trạng thái thô từ API hãng xe | **GIỮ NGUYÊN key**, thêm comment nguồn |
| 🔴 Cần chủ sở hữu quyết | `lib/template-builder.ts` (145 dòng) — nội dung **văn bản pháp lý** (《民法典》…) | **CHỜ DUYỆT** — đây là dịch pháp lý chuyên nghiệp, không phải thay chuỗi |
| 🔴 Cần chủ sở hưởn quyết | `lib/ai/review-prompts.ts`, `lib/yuandian/*` — prompt gửi **model ngoài** (Qwen/chineselaw.com) | **CHỜ DUYỆT** — ảnh hưởng chất lượng phản hồi AI |
| 🔴 Dữ liệu sai thị trường | `lib/china-regions.ts` (china-division) — tỉnh/Trung Quốc | **CHỜ DUYỆT** — cần dữ liệu Tỉnh/Quận/Huyện VN, không phải dịch |
| 🔴 Dữ liệu đầu vào | `lib/sms-parser.ts` (70 dòng) — từ khóa **tin nhắn toà án Trung** | **CHỜ DUYỆT** — phụ thuộc nguồn SMS thực tế |

## Thuật ngữ đã chốt (dùng nhất quán)

| Tiếng Trung | Tiếng Việt | Ghi chú |
|---|---|---|
| 待处理 | Chờ xử lý | |
| 已开具 | Đã xuất HĐ | HĐ = hóa đơn |
| 已驳回 / 驳回 | Đã từ chối / Từ chối | |
| 全部 | Tất cả | |
| 普通发票 | Hóa đơn thường | |
| 增值税专用发票 | Hóa đơn GTGT | |
| 律师服务费 / 法律咨询费 / 代理费 | Phí luật sư / Phí tư vấn / Phí đại diện | |
| 其他法律服务 | Dịch vụ pháp lý khác | |
| 发票 / 电子发票 | Hóa đơn / Hóa đơn điện tử | |
| 发票号 | Số hóa đơn | |
| 税号 | Mã số thuế | |
| 抬头 | Đơn vị mua | |
| 名目 | Khoản mục | |
| 开户行 | Ngân hàng mở TK | |
| 购方 / 销售方 | Bên mua / Bên bán | |
| 无关联案件 | Không liên kết vụ án | |
| 关联案件 | Vụ án liên quan | |
| 申请人 | Người yêu cầu | |
| 申请时间 | Thời gian yêu cầu | |
| 申请备注 / 备注 | Ghi chú yêu cầu / Ghi chú | |
| 申请附件 / 依据 | Đính kèm yêu cầu / Căn cứ | |
| 历史合同 | Hợp đồng cũ | |
| 处理 / 确认开具 | Xử lý / Xác nhận xuất | |
| 补传发票 | Bù hóa đơn | |
| 取消 | Huỷ | |
| 识别结果 | Kết quả nhận diện | |
| 重新选择 / 选择文件 | Chọn lại / Chọn tệp | |
| 已存 | Đã lưu | |
| 未填写 | Chưa điền | |

## Tiến độ (cập nhật mỗi chu kỳ)

| Chu kỳ | Module | Trạng thái |
|---|---|---|
| I18N-1 | `finance/_components/invoice-management.tsx` (93 dòng → 0, trừ comment license) | ✅ Xong, 159 test pass, /finance 200 |
| I18N-2 | `src/lib/enums.ts` (13 dòng comment) + `finance/_components/invoice-create-dialog.tsx` (59) | ⬜ Tiếp theo |
| I18N-3..N | Xếp theo danh sách 703 file — ưu tiên module server/trước (message lỗi), rồi UI | ⬜ |

## Ghi chú kỹ thuật

- Comment license (`Copyright 2026 叶森 (Sen Ye)`) **giữ nguyên** — đó là tên tác giả, không phải UI.
- Sau mỗi module: chạy `grep -cP '[\x{4e00}-\x{9fff}]' <file>` để xác nhận chỉ còn comment license (2 dòng).
- Chuỗi test phải đổi **trong cùng commit** với code để test luôn xanh (red-green).
