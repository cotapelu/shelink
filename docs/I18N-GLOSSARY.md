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

## Bổ sung I18N-2→4 (2026-10-31)

| Tiếng Trung | Tiếng Việt |
|---|---|
| 是 / 否 | Có / Không (boolean export) |
| 主 (liên hệ) | Chính |
| 受理 / 结案 / 结果 (thủ tục) | Tiếp nhận / Kết thúc / Kết quả |
| 证件 / 代码 / 电话 / 法定代表人 / 联系人 / 地址 / 备注 | Số giấy tờ / Mã số thuế / Điện thoại / Người đại diện / Người liên hệ / Địa chỉ / Ghi chú |
| 案件名称必填 / 至少选择一个委托方 | Tên vụ án bắt buộc nhập / Chọn ít nhất một bên ủy quyền |
| 案由 | Nguyên nhân (cause) |

### ⚠️ Bài học đắt giá (I18N-4)
- **Luôn grep TOÀN BỘ file test** trước khi kết luận "không coupling". Ở `schemas.test.ts`, grep `head` chỉ thấy license + data mẫu → tưởng không bám; thực tế 2 assertion bám message. Phát hiện nhờ **full test suite** sau khi đã đổi source.
- Dấu fullwidth `（），；：` chỉ đổi **đúng chỗ đang chạm** (party/procedure export), chỗ khác (members, contacts) giữ để tránch churn test — chu kỳ riêng cho punctuation.

## Bổ sung I18N-5 (2026-10-31) — procedure-content

| Tiếng Trung | Tiếng Việt |
|---|---|
| 诉讼时效 / 举证期限 / 上诉期 / 履行期 / 答辩期 / 撤销仲裁期 / 保全期限 | Thời hiệu khởi kiện / Thời hạn chứng minh / Thời hiệu kháng cáo / Thời hạn thực hiện / Thời hạn trả lời / Thời hạn xin hủy án trọng tài / Thời hạn bảo toàn |
| 第N次Xét xử | lần xét xử thứ N |
| 案号 / 当事人 | Số án / Các bên |
| 所处程序 / 审理法院 / 法庭 / 主审 / 联系 | Thủ tục / Toà xét xử / Phòng xét xử / Chủ tọa / Liên hệ |
| 提前提醒（天）/ 计算依据 / 到期日 / 单号 | Nhắc trước (ngày) / Cơ sở tính / Ngày đến hạn / Mã số |
| Nhận的人 / Nhận电话 / Chuyển phát公司 / 用途 / 方向 | Người nhận / Điện thoại người nhận / Hãng chuyển phát / Mục đích / Hướng |

**Kỹ thuật mới**: file hỗn hợp Việt–Trung (dịch dở) → dùng **script thay chính xác (ordered string pairs, chuỗi dài trước)**, xác nhận `applied: 80/82`, rồi xử lý sót bằng sed từng dòng. Không dùng regex trên toàn file (dễ vỡ chuỗi dài).

## Bổ sung I18N-6 (2026-10-31) — procedure-info-panel

| Tiếng Trung | Tiếng Việt |
|---|---|
| 一审/二审/再审/重审信息 | Thông tin sơ thẩm / phúc thẩm / tái thẩm / xét xử lại |
| 商事仲裁/劳动仲裁信息 | Thông tin trọng tài thương mại / lao động |
| 撤销仲裁裁决/不予执行仲裁审查 | Xin hủy án trọng tài / Xem xét không thi hành án trọng tài |
| 强制执行/执行异议信息 | Cưỡng chế thi hành / Phản đối thi hành án |
| 侦查/审查起诉/死刑复核/刑罚执行/减刑假释审查 | Điều tra / Xét xử truy tố / Xem xét tử hình / Thi hành án hình sự / Xem xét giảm án-tha tù |
| 行政复议/非诉行政执行/非诉阶段 | Khiếu nại hành chính / Thi hành hành chính phi tố tụng / Giai đoạn phi tố tụng |
| 客户/相对方/第三人/共同诉讼人/代理人/证人 | Khách hàng / Bên đối phương / Người thứ ba / Đồng khởi kiện / Người đại diện / Nhân chứng |
| 胜诉/部分胜诉/败诉/调解/撤回/驳回 | Thắng kiện / Thắng kiện một phần / Thua kiện / Hòa giải / Rút đơn / Bác bỏ |
| 主审法官/执行法官/首席仲裁员 | Thẩm phán chủ tọa / Thẩm phán thi hành án / Trọng tài viên trưởng |
| 诉讼请求/仲裁请求 | Yêu cầu khởi kiện / Yêu cầu trọng tài |
| 管辖地/管辖机构/立案/裁决 | Địa giới / Cơ quan xử lý / Tiếp nhận / Kết thúc-quyết định |
| 证件号/统一社会信用代码 | Số giấy tờ / Mã số thuế |

### ⚠️ Bẫy thứ tự thay (I18N-7)
Khi bảng thay có cả chuỗi ngắn ("主办律师") và chuỗi dài chứa nó ("选择主办律师"), thay chuỗi ngắn trước sẽ để lại chuỗi lai ("选择Luật sư chủ trì"). **Nguyên tắc: sắp xếp bảng thay theo độ dài GIẢM DẦN** (chuỗi dài trước), hoặc grep lại sau mỗi lần thay.
