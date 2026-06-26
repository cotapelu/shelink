## LawLink Công việc khu vực quy tắc

> Đây là tài liệu "ràng buộc trước" của dự án. Bất kỳ trợ lý AI nào (bao gồm Claude Code) hoặc cộng tác viên con người nào làm việc trong kho lưu trữ này, phải đọc file này trước.
> Khi quy tắc và thực hành xung đột, sửa file này trước, rồi mới sửa code.

---

### 1. Vị trí dự án

- **LawLink** là một hệ thống quản lý vụ án/dự án **mở nguồn, tự triển khai** dành cho luật sư độc lập, nhóm nhỏ và các văn phòng luật nhỏ.
- Luồng công việc chính phiên bản đầu tiên:
  `Đăng ký vụ án → Tìm kiếm xung đột → Chuyển thành vụ án chính thức → Theo dõi liên tục → Ghi chép tài chính → Lưu trữ hoàn tất → Xuất dữ liệu`
- **Không làm SaaS chia sẻ đa thuê bao**. Mỗi văn phòng luật/nhóm triển khai một phiên bản, ứng dụng đơn thể + cơ sở dữ liệu đơn.
- Giấy phép: **MIT**.

---

### 2. Công nghệ stack (đã định hình)

| Lớp | Lựa chọn | Giải thích |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | SSR + RSC, kho đơn, tiến trình đơn |
| UI components | **shadcn/ui** + Radix UI | Components sao chép, tùy chỉnh sâu |
| Styling | **Tailwind CSS** | Ưu tiên chế độ tối |
| Animation | **Framer Motion** | Vi xương tương tác, chuyển trang |
| React | React 19 | Đi kèm Next.js 16 |
| Icons | lucide-react | |
| Charts | Recharts | Bảng điều khiển, thống kê tài chính |
| Forms | React Hook Form + Zod | |
| Tables | TanStack Table | Lọc, sắp xếp, phân trang ở tiêu đề bảng |
| Database | PostgreSQL 16 + Prisma 5 | |
| Auth | NextAuth.js (Credentials Provider) | Đăng nhập email mật khẩu |
| Deployment | Docker Compose (app + postgres) | |

**Đã từ bỏ**: Ant Design. Không được giới thiệu lại `antd` hoặc `@ant-design/*`.

**Dự trữ kết nối** (V1.5): Nền tảng MCP mở Mộc điển (law/case/company), dùng để tăng cường tìm kiếm xung đột và kiểm tra doanh nghiệp.

---

### 3. Quy ước thư mục

```
LawLink/
├── docs/                  # Tài liệu thiết kế (PRD / DATA-MODEL / UI-DESIGN)
├── prisma/                # schema, migrations, seed
├── public/                # Tài nguyên tĩnh
├── storage/               # Tệp riêng tư cục bộ (không commit git)
├── src/
│   ├── app/               # Định tuyến và Route Handler
│   │   ├── (auth)/        # Nhóm định tuyến đăng nhập, đăng ký
│   │   ├── (app)/         # Nhóm định tuyến chính sau khi đăng nhập
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── ui/            # shadcn/ui components (không sửa trực tiếp, tạo lại khi cần)
│   │   ├── layout/        # AppShell, Sidebar, Topbar
│   │   ├── matters/       # Components tổ hợp liên quan vụ án
│   │   └── ...
│   ├── lib/               # Quy tắc nghiệp vụ, hàm tiện ích, Prisma client
│   │   ├── auth/          # Cấu hình NextAuth, session helpers
│   │   ├── permissions/   # Vai trò quyền hạn, khả năng hiển thị vụ án
│   │   └── ...
│   ├── server/            # Server Actions, lớp dịch vụ
│   ├── types/             # Kiểu TS dùng chung
│   └── styles/            # globals.css, mở rộng Tailwind config
└── tests/                 # (Giới thiệu ở V1.5)
```

**Quy tắc**:
- `src/components/ui/` chỉ chứa atomic components do shadcn CLI tạo, business components đặt ở thư mục cùng cấp.
- Components dùng lại qua nhiều trang đặt vào `src/components/`, components chỉ dùng ở trang đơn đặt gần trong thư mục định tuyến dưới dạng `_components/`.
- Quy tắc nghiệp vụ (tính toán tiền, máy trạng thái, thuật toán khớp xung đột) phải được đọng lại ở `src/lib/` hoặc `src/server/`, nghiêm cấm rải rác trong trang.

---

### 4. Quy ước đặt tên

| Đối tượng | Kiểu | Ví dụ |
|---|---|---|
| Thư mục định tuyến | Chữ thường số nhiều tiếng Anh | `matters/`, `intakes/`, `conflicts/` |
| React component | PascalCase | `MatterCard.tsx` |
| Hàm tiện ích | camelCase | `formatCurrency`, `computeReceivable` |
| Server Action | camelCase + động từ đầu | `createMatter`, `closeMatter` |
| Prisma model | PascalCase số ít | `Matter`, `Client` |
| Trường Prisma | camelCase | `caseNumber`, `createdAt` |
| Bảng DB (tự động) | snake_case | Kiểm soát bởi Prisma `@@map` |

**Cố định thuật ngữ**:
- Clue intake → `Intake`
- Vụ án/dự án chính thức → `Matter`
- Khách hàng (tổ chức/cá nhân) → `Client`
- Người liên hệ khách hàng → `Contact`
- Bên liên quan/đối tác/người thứ ba → `Party`
- Ghi chép thu/chi → `FeeEntry`
- Hóa đơn (hợp đồng/hóa đơn) → `Billing`
- Hạn chế pháp lý → `Deadline` (có `category`: thời hiệu đệ kiện/chứng cứ/phúc thẩm/thực hiện/khác)

---

### 5. Kỷ luật phát triển

1. **Sửa tài liệu ưu tiên hơn sửa code**. Khi yêu cầu hoặc quy định thay đổi, sửa `docs/` và file này trước, rồi mới viết implementation.
2. **Thứ tự module mới**: Data model → Types → Server Action → UI. Không được viết UI trước rồi bổ sung data.
3. **Quy tắc nghiệp vụ tập trung**. Máy trạng thái (chuyển đổi `Intake → Matter`, nhảy vượt giai đoạn `Matter`), tính toán tiền, xác định quyền hạn, nhất quán ở `src/lib/` hoặc `src/server/`, không viết trong React component.
4. **Không comment bỏ validation, bypass permission check, `@ts-ignore` cả khối** chỉ để code chạy. Tìm nguyên nhân gốc rễ.
5. **Key, token, password** không vào code, không vào commit, không vào log, không vào screenshot. `.env` luôn trong `.gitignore`.
6. **Prisma migration**: dùng `prisma migrate dev --create-only` tạo SQL cho Yến xem trước, rồi mới thực thi. Migration sản xuất dùng `prisma migrate deploy`.
7. **Xóa file, sửa `.env`/CI, `git reset/rebase/push`, triển khai sản xuất** phải xin phép Yến trước (đường đỏ).
8. **Tệp đính kèm** mặc định riêng tư trong `storage/`, tải qua API có xác thực, không lộ link công khai.

---

### 6. Quyền hạn và kiểm toán

- **Vai trò** (V1): `ADMIN` / `PRINCIPAL_LAWYER` / `LAWYER` / `ASSISTANT` / `FINANCE`.
- **Khả năng hiển thị**: `Matter` mặc định chỉ thấy với `owner` + `members` + `ADMIN`; `FINANCE` thấy mọi trường tài chính của vụ án nhưng không chỉnh sửa nội dung vụ án.
- **Audit log** (`AuditLog`) phải ghi: đăng nhập/đăng xuất, tạo/xem/sửa/lưu trữ vụ án, tải tài liệu, thay đổi tài chính, tìm kiếm xung đột, thay đổi quyền hạn.
- Phiên bản đầu **không làm ma trận quyền hạn cấp trường**, dùng "vai trò + thành viên vụ án" bao phủ là đủ.

---

### 7. Lệnh xác thực (chạy mỗi lần sửa xong)

```bash
npm run lint              # ESLint CLI
npm run typecheck         # tsc --noEmit
npm run prisma:validate   # Kiểm tra schema Prisma
npm run build             # Build production (kiểm tra nghiêm ngặt nhất)
```

Thay đổi UI còn: trong trình duyệt chạy "đường vàng" (luồng công việc điển hình), không chỉ nhìn type/build.

Mỗi lần sửa còn phải xác nhận site cục bộ vẫn truy cập được: trước kiểm tra tiến trình lắng nghe cổng thuộc `/Users/yesen/Code/LawLink`, rồi mở `http://localhost:3000/login` hoặc trang liên quan. Nếu service đã dừng hoặc cổng không thuộc repo này, khôi phục/chuyển sang service LawLink đúng rồi xác thực lại trước khi giao hàng; không được chỉ báo cáo code validation pass.

---

### 8. An ninh đáy

- Tệp đính kèm riêng tư, link tải có token ngắn hạn.
- Nội dung vụ án, thông tin liên hệ khách hàng, số căn cước, mã số thuếếxiview dữ liệu nhạy cảm, frontend hiển thị phải hỗ trợ chuyển đổi "che/mở rõ".
- Log không output PII (giá trị đầy đủ số căn cước, điện thoại, địa chỉ).
- `AuditLog` không được business code xóa, chỉ được lưu trữ.

---

### 9. Danh sách tài liệu

| Tệp | Vai trò |
|---|---|
| `AGENTS.md` (file này) | Sắt thép công việc khu vực, mọi cộng tác viên phải đọc |
| `docs/PRD.md` | Yêu cầu sản phẩm và phạm vi chức năng |
| `docs/DATA-MODEL.md` | Thiết kế chi tiết mô hình dữ liệu và ER diagram |
| `docs/UI-DESIGN.md` | Ngôn ngữ thiết kế, bảng màu, wireframe trang chính |
| `README.md` | Cửa nhà kho, hướng dẫn cài đặt chạy |
| `CHANGELOG.md` | Thay đổi phiên bản (tạo khi phát hành V1) |

---

### 10. Ghi chú đặc biệt cho AI trợ lý

- Mặc định trả lời tiếng Việt, code/trường/định tuyến dùng tiếng Anh.
- Kết luận trước, nếu方案 có vấn đề chỉ ra ngay.
- Liên quan đường đỏ (xóa file, sửa `.env`/CI, `git push`/`reset`/`rebase`, triển khai sản xuất, migration Schema) **phải** xin đồng ý của Yến trước.
- Không nộp nhiều thay đổi chỉ để "trông bận rộn". Mỗi lần thay đổi nằm trong phạm vi có thể rà soát.
- Danh sách xác thực tự động ở mục 7.
