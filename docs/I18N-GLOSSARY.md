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

## Bổ sung I18N-8 (2026-10-31) — intake-sheet + chrome app

| Tiếng Trung | Tiếng Việt |
|---|---|
| 新建收案 (nút) / 新建收案 (dialog) | Tạo tiếp nhận / Tạo tiếp nhận mới |
| 待审批 / 待补正 | Chờ duyệt / Chờ bổ sung |
| 夜深了/早安/中午好/下午好/晚上好 | Đêm khuya rồi / Chào buổi sáng / trưa / chiều / tối |
| 今日焦点 / 近期日程 / 近期期限 | Tiêu điểm hôm nay / Lịch sắp tới / Thời hạn sắp tới |
| 利益冲突预检 | Kiểm tra sơ bộ xung đột lợi ích |
| 主办/协办律师 | Luật sư chủ trì / Cộng tác viên |
| 系统管理员/经办律师/助理/财务 | Quản trị viên / Luật sư phụ trách / Trợ lý / Tài chính |
| 实务工具/快递跟踪/律所文书/法律导航/公告指引/制度规范/通讯录 | Công cụ / Theo dõi chuyển phát / Văn bản văn phòng / Điều hướng pháp lý / Thông báo / Quy chế / Danh bạ |
| 案件管理 | Quản lý vụ án |
| 搜索/筛选/排序/导出/清除 | Tìm / Lọc / Sắp xếp / Xuất / Xoá lọc |

### ⚠️ Bẫy thứ tự lặp lại LẦN 2 (I18N-8) — đã xử lý
Batch script lại rơi vào bẫy "件" (ngắn) thay trước "案件管理" (dài) → "案vụ管理". **Cách xử lý đã dùng**: chạy batch → script phát hiện remaining → script thứ 2 sửa chuỗi lai chính xác. **Nguyên tắc bất biến: sắp cặm thay theo độ dài GIẢM DẦN**; khi phát sinh lai, xử lý bằng cặm chính xác, KHÔNG regex.

## Bổ sung I18N-9 (2026-10-31) — reports

| Tiếng Trung | Tiếng Việt |
|---|---|
| 本月/本季/本年/上年 | Tháng này / Quý này / Năm này / Năm trước |
| 本期新收/在办中/本期已结/本期已归档 | Tiếp nhận mới kỳ này / Đang xử lý / Đã kết thúc kỳ này / Đã lưu trữ kỳ này |
| 归档率 | Tỷ lệ lưu trữ |
| 律师产出/客户应收/办案周期 | Sản lượng luật sư / Phải thu khách hàng / Chu kỳ xử lý |
| 应收/已收/余额 | Phải thu / Đã thu / Còn lại |
| 样本数/均值/中位数/最快/最慢（天） | Số mẫu / Trung bình / Trung vị / Nhanh nhất / Chậm nhất (ngày) |
| 缺失/风险/问题/建议 | Thiếu / Rủi ro / Vấn đề / Đề xuất |
| 高/中/低严重 | Nghiêm trọng cao/TB/thấp |
| 扫描已结超 30 天未归档 | Quét vụ đã kết thúc quá 30 ngày chưa lưu trữ |
| 推送周报 | Đẩy báo cáo tuần |
| 起始（含）/结束（含）/最大跨度 | Bắt đầu (gồm) / Kết thúc (gồm) / Khoảng cách tối đa |

## Bổ sung I18N-10 (2026-10-31) — express (phân tầng ràng buộc API)

| Giữ nguyên (hợp đồng API) | Giải thích |
|---|---|
| STATE_TONE keys 已签收/在途/派件中/疑难件/退签... | Trạng thái THÔ trả về từ API 快递鸟/快递100 — dịch = mất khả năng khớp. Đã thêm comment trong file. |
| COMPANY_CODES keys (lib/express/companies.ts) | Tên hãng gửi cho API — giữ. |

| Tiếng Trung | Tiếng Việt |
|---|---|
| 快递追踪/新建追踪 | Theo dõi chuyển phát / Tạo theo dõi |
| 快递公司/快递单号 | Hãng chuyển phát / Mã đơn chuyển phát |
| 寄件人/收件人 | Người gửi / Người nhận |
| 寄出/收到 | Gửi đi / Nhận về |
| 物流轨迹/上次刷新 | Lộ trình vận chuyển / Cập nhật lần cuối |
| 自动识别 / 未知 | Tự nhận diện / Không rõ |
| 创建中/创建并查询 | Đang tạo... / Tạo và tra cứu |
| 顺丰/中通/圆通... (tên thương hiệu) | Giữ tên thương hiệu: ShunFeng / ZTO / YTO... |

**Quyết định thiết kế**: khi key/giá trị là **hợp đồng với hệ thống ngoài** (API response enum), ta giữ giá trị gốc + comment, KHÔNG dịch. Dịch chỉ áp dụng cho dữ liệu do app tự sinh (label/message).

## Bổ sung I18N-11/12 (2026-10-31)

| Tiếng Trung | Tiếng Việt |
|---|---|
| 阻塞/高/中/低 (mức độ) | Chặn / Cao / Trung bình / Thấp |
| 待结论/有冲突/可承接/信息不足 | Chờ kết luận / Có xung đột / Có thể tiếp nhận / Thông tin chưa đủ |
| 冲突命中/客户库同名 | Khớp xung đột / Cùng tên trong kho khách |
| 证据材料/诉讼文书/程序性材料/裁判文书/合同 | Tài liệu chứng cứ / Văn bản tố tụng / Tài liệu thủ tục / Văn bản quyết định / Hợp đồng |
| 归属卷宗/散件/结案/归档 | Hồ sơ chứa / Tài liệu rời / Kết thúc / Lưu trữ |
| 材料名称/上传材料/加密 | Tên tài liệu / Tải lên tài liệu / Mã hóa |
| 点击选择文件 | Bấm để chọn tệp |

## Bổ sung I18N-13/14 (2026-10-31)

| Tiếng Trung | Tiếng Việt |
|---|---|
| 开庭/庭审/上诉期/举证期/答辩期 | phiên tòa / xét xử / Thời hiệu kháng cáo / Thời hạn chứng minh / Thời hạn trả lời |
| 诉讼费缴纳/判决书生效 | Nộp phý tố tụng / Bản án có hiệu lực |
| 承办法官/法庭 | Thẩm phán chủ trì / Phòng xét xử |
| 保全/被保全人/续保 | Bảo toàn / Bên bị bảo toàn / Gia hạn bảo toàn |
| 保全法院/裁定书编号/保全金额 | Toà ra quyết định bảo toàn / Số quyết định / Số tiền bảo toàn |
| 跟进负责人/生效日期 | Người phụ trách theo dõi / Ngày có hiệu lực |
| 诉前可空 | Trước khi kiện có thể để trống |

### ⚠️ Code-string ↔ seed-data coupling (I18N-12b)
`ARCHIVE_FOLDER_NAMES` trong documents-panel khớp với **tên hồ s do seed tạo**. Đổi chuỗi code mà không đổi seed → lệch. **Nguyên tắc: khi đổi chuỗi khớp dữ liệu, phải sửa CẢ HAI + UPDATE DB dev.**

## Bổ sung I18N-15 (2026-11-01) — "thay toàn bộ", 4 gói song song

**Bối cảnh đo lại**: 702 file có chữ Hán → **309 file chỉ còn comment license** (tên tác giả, giữ nguyên) → **393 file / 4596 dòng thực**. Trong đó ~642 dòng là comment (an toàn) và ~3954 dòng là chuỗi UI/lỗi/test/seed.

**Gói công việc (file set KHÔNG chồng lấn, mỗi gói 1 agent)**:

| Gói | Phạm vi | Số file |
|---|---|---|
| A backend | `src/server/**` (trừ `ai/`, `yuandian/`) + `src/tests/server/**` (trừ `ai/`, `yuandian/`) | 90 |
| B matters | `src/app/(app)/matters/**` | 46 |
| C ui-admin | `src/app/(app)/{settings,approvals,contacts,conflicts,audit,announcements,inbox,archive,tools}/**` | 99 |
| D ui-ops | `src/app/{api,layout.tsx,(app)/page.tsx,globals.css}` + `(app)/{intakes,clients,firm-resources,schedule,preservation,finance,express,notifications,policy}` + `src/components/**` + `src/tests/app/**` | 91 |
| E lib (parent) | `src/lib/**` (trừ blocked) + `src/tests/lib/**` (trừ blocked) + `src/server/ai/**` + `src/tests/server/ai/**` | 52 |
| 🔴 blocked (giữ/chờ duyệt) | `lib/{express,template-builder,ai/review-prompts,china-regions,sms-parser*,yuandian}`, `server/yuandian`, `server/settings/yuandian-actions` | 15 |

**Quy tắc bất biến khi chạy song song**:
1. Chỉ sửa file trong gói mình — KHÔNG đụng file gói khác (tránh xung đột).
2. KHÔNG chạy `npm run typecheck` / `npm run build` / `next typegen` (ghi đè `.next/types` lẫn nhau) — parent chạy tuần tự sau cùng. Chỉ chạy `npx vitest run <path-test-của-gói>` và `npx eslint <file-đã-sửa>`.
3. KHÔNG chạy git (parent commit).
4. Sắp cặm thay theo độ dài GIẢM DẦN (bẫy I18N-7/8); khi phát sinh chuỗi lai → sửa bằng cặm chính xác, KHÔNG regex toàn file.
5. Chuỗi test đổi cùng luồng với source (đỏ–xanh).
6. Comment license `Copyright 2026 叶森 (Sen Ye)` / COTAPELU **giữ nguyên**.
7. Dịch: nhãn UI, message lỗi, toast, placeholder, cột bảng, comment, tên hiển thị mẫu. **Không** dịch: identifier, key JSON, enum value, tên route, tên biến, khóa API.
8. `toLocaleString/toLocaleDateString("zh-CN")` → `"vi-VN"`; `<html lang="zh-CN">` → `"vi"`.

| Tiếng Trung | Tiếng Việt |
|---|---|
| 合同 / 新增合同 / 合同名称 / 合同金额 / 生效中 / 草稿 | Hợp đồng / Thêm hợp đồng / Tên hợp đồng / Giá trị hợp đồng / Đang hiệu lực / Nháp |
| 案件 / 案件名称必填 | Vụ án / Tên vụ án bắt buộc nhập |
| 材料 / 上传材料 / 材料名称必填 / 加密 | Tài liệu / Tải lên tài liệu / Tên tài liệu bắt buộc nhập / Mã hóa |
| 用户管理 / 新增用户 / 姓名 / 邮箱 / 角色 / 案件 / 最近登录 | Quản lý người dùng / Thêm người dùng / Họ tên / Email / Vai trò / Vụ án / Đăng nhập gần nhất |
| 收件箱 / 粘贴短信 / 待处理 / 已处理 / 无待处理短信 / 暂无已处理记录 | Hộp thư đến / Dán tin nhắn / Chờ xử lý / Đã xử lý / Không có tin nhắn chờ xử lý / Chưa có bản ghi đã xử lý |
| 日程 / 未来 90 天的开庭与期限 | Lịch làm việc / Phiên tòa & thời hạn trong 90 ngày tới |
| 开庭 / 期限 / 事项 | phiên tòa / thời hạn / công việc |
| 单号至少 6 位 / 用途必填 / 快递记录不存在 / 关联案件不存在 | Mã vận đơn tối thiểu 6 ký tự / Mục đích bắt buộc nhập / Không tìm thấy bản ghi chuyển phát / Vụ án liên kết không tồn tại |
| 缺少文件 / 解析并保存（支持批量） | Thiếu tệp / Phân tích và lưu (hỗ trợ nhiều bản ghi) |
| 归档 / 卷宗封皮 / 封皮和目录 | Lưu trữ / Bìa hồ sơ / Bìa và mục lục |
| 收到新法院短信 / 案件收到新的法院短信 | Nhận tin nhắn mới từ toà án / Vụ án có tin nhắn mới từ toà án |
| 仅支持图片格式 / 超过 10MB | Chỉ hỗ trợ định dạng ảnh / Vượt quá 10MB |
| 中文公司名 / 公司名 | Tên công ty / Tên công ty |
| 工作台 mock 数据 | Dữ liệu mock bảng làm việc |

## Bổ sung I18N-15→18 (2026-11-01) — Việt hóa toàn bộ phần còn lại (5 gói)

**Kết quả**: từ 309 file chỉ còn comment license → **toàn bộ src/ trừ các cụm contract/data bên dưới đã là tiếng Việt**. Các gói: lib(23 file) + server(57) + server/ai(12) + matters(47) + ui-admin(84) + ui-ops(52).

**Thay đổi hệ thống (không chỉ chuỗi)**:
- `formatCurrency/formatDate` (`lib/utils.ts`): `zh-CN` + **CNY** → `vi-VN` + **VND**; compact `X万` → `X tr`.
- Các chỗ hiển thị tiền hardcode `¥` trong dữ liệu app (clients/matters/finance) → `formatCurrency` (VND).
- `generateTitle`/`buildAutoTitle`: bỏ `.replace(/\s+/g,"")` (nuốt khoảng trắng tiếng Việt), separator `与` → `và`, format `A và B - Nguyên nhân`.

**Giữ nguyên — contract/API (đã ghi chú trong code)**:
| Cụm | Giá trị giữ | Lý do |
|---|---|---|
| `lib/express/companies.ts`, `STATE_TONE` | tiếng Trung | hợp đồng API 快递鸟/快递100 |
| `lib/china-regions.ts` + list `PROVINCES`/wszl trong `matters/.../keyword-search-form.tsx`, `case-search-panel.tsx` | tiếng Trung | dữ liệu/tham số tra cứu án lệ Trung Quốc — **chờ duyệt**: cần tỉnh/VN + nguồn tra VN |
| `template-builder.ts`, `template-engine.ts`, `render.ts` nameMap (卷宗封皮/目录), `toCNDate`, `numberToChinese` | tiếng Trung | mẫu + chữ số văn bản pháp lý seed sẵn trong DB — **chờ duyệt dịch chuyên nghiệp** |
| `lib/sms-parser*.ts` | tiếng Trung | từ khóa tin nhắn toà án — **chờ duyệt** |
| `lib/yuandian/*`, `server/yuandian`, `server/settings/yuandian-actions`, tên hiển thị 元典 | tiếng Trung (tên dịch vụ) | prompt/API model ngoài — **chờ duyệt** |
| `lib/ai/review-prompts.ts` | tiếng Trung | prompt model ngoài — **chờ duyệt** |
| `archive-no.ts`/`firm-profile.ts` `CATEGORY_SHORT`, token案号 {年}/{所}/{类词}/{序3} | ký tự/token gốc | tương thích mã đã lưu DB + hợp đồng cấu hình |
| `recommend-cause.ts` prompt: yêu cầu tên案由 tiếng Trung | tiếng Trung | tên nguyên nhân trong DB đang là tiếng Trung (prisma/seeds/causes-*) |
| tên dịch vụ/thương hiệu: 通义千问, 智谱, 快递鸟, 快递100, 案件云 | tên riêng | tên thương hiệu, không dịch |
- `mock-data.ts` — **code chết, không ai import** (GOAL §5.7.3: không xóa, chỉ báo) — chờ chủ sở hưởng quyết định xóa hay khôi phục.
- `tools/calc` (诉讼费/迟延履行金): giữ `¥` + tên luật Trung trong nhãn — công cụ tính theo luật tố tụng TQ; **chờ duyệt**: giữ / thay bằng luật VN / bỏ.

**Bẫy lặp lại (ghi nhận)**:
1. Block comment có dòng trống ` *` bị grep ẩn → nhiều cặm thay trượt. Cách xử lý: grep context bằng python đọc cả block trước khi thay.
2. Thay chuỗi ngắn trước chuỗi dài chứa nó tạo chuỗi lai (`hồ sơ对应文档`, `Xác nhận thu hồi销`, `Thêm加被保全人`) → luôn kiểm tra leftover sau mỗi batch.
3. **STATE_TONE đã suýt dịch key** (key = giá trị trạng thái thô từ API) — đã khôi phục nguyên gốc + ghi chú. Bài học: với object map dữ liệu ngoài, phải xác định key có phải contract không TRƯỚC khi thay.
4. Test co-located ngoài `src/tests` (`src/app/**/__tests__`, `*.test.tsx` cạnh component) — chạy `npm test` (không phải `vitest run src/tests`) mõi Full gate.
