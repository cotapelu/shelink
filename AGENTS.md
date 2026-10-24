# AGENTS.md — Ràng buộc trước cho dự án (Công ty nhỏ / Văn phòng độc lập)

> Đây là tài liệu "ràng buộc trước". Bất kỳ trợ lý AI hoặc cộng tác viên nào làm việc trong kho này **phải đọc file này trước**. Khi quy tắc và thực hành xung đột, sửa file này trước, rồi mới sửa code.

---

## 1. Vị trí dự án

- **Tên kho**: `shelink` (hiện tại), định hướng thành hệ điều hành quản trị cho **công ty nhỏ, văn phòng độc lập, studio dịch vụ** (tư vấn, thiết kế, kế toán, marketing, thương mại nhỏ…), không nhất thiết là luật.
- **Mô hình**: Ứng dụng đơn thể (monolith) + cơ sở dữ liệu đơn (PostgreSQL). Mỗi công ty/văn phòng tự triển khai một phiên bản trên server của mình. **Không làm SaaS đa thuê đơn chia sẻ** trong V1.
- **Giấy phép**: MIT.

Luồng công việc chính V1:
`Đăng ký / Điều phối → Tạo dự án hoặc hợp đồng → Theo dõi tiến độ → Ghi chép tài chính → Lưu trữ hoàn tất → Xuất dữ liệu`

---

## 2. Công nghệ stack (đã định hình)

| Lớp | Lựa chọn | Giải thích |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | SSR + RSC, kho đơn, tiến trình đơn |
| UI components | shadcn/ui + Radix UI | Components sao chép, tùy chỉnh sâu |
| Styling | Tailwind CSS | Ưu tiên chế độ tối |
| Animation | Framer Motion | Tương tác mượt, chuyển trang |
| React | React 19 | Đi kèm Next.js 16 |
| Icons | lucide-react | |
| Charts | Recharts | Bảng điều khiển, thống kê tài chính |
| Forms | React Hook Form + Zod | |
| Tables | TanStack Table | Lọc, sắp xếp, phân trang |
| Database | PostgreSQL 16 + Prisma 5 | |
| Auth | NextAuth.js (Credentials Provider) | Đăng nhập email/mật khẩu |
| Deployment | Docker Compose (app + postgres) | |

**Đã từ bỏ**: Ant Design. Không được giới thiệu lại `antd` hoặc `@ant-design/*`.

**Dự trữ kết nối** (V1.5): Nền tảng MCP mở để tích hợp dịch vụ bên ngoài (email, Zalo, hóa đơn điện tử, storage đám mây).

---

## 3. Quy ước thư mục

```
repo-root/
├── docs/                  # PRD.md, DATA-MODEL.md, UI-DESIGN.md, v.v.
├── prisma/                # schema, migrations, seed
├── public/                # Tài nguyên tĩnh
├── storage/               # Tệp riêng tư cục bộ (không commit git)
├── src/
│   ├── app/               # Định tuyến và Route Handler
│   │   ├── (auth)/        # Nhóm định tuyến đăng nhập, đăng ký
│   │   ├── (app)/         # Nhóm định tuyến chính sau khi đăng nhập
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── ui/            # shadcn/ui components (không sửa trực tiếp)
│   │   ├── layout/        # AppShell, Sidebar, Topbar
│   │   ├── domain/        # Components nghiệp vụ (dự án, hợp đồng, khách hàng…)
│   │   └── …
│   ├── lib/               # Quy tắc nghiệp vụ, hàm tiện ích, Prisma client
│   │   ├── auth/          # Cấu hình NextAuth, session helpers
│   │   ├── permissions/   # Vai trò, quyền hạn, khả năng xem dữ liệu
│   │   └── …
│   ├── server/            # Server Actions, lớp dịch vụ
│   ├── types/             # Kiểu TS dùng chung
│   └── styles/            # globals.css, mở rộng Tailwind config
├── tests/                 # Vitest
└── AGENTS.md              # File này
```

**Quy tắc**:
- `src/components/ui/` chỉ chứa atomic components do shadcn CLI tạo. Components dùng lại qua nhiều trang đặt ở `src/components/domain/` hoặc `src/components/`. Components chỉ dùng ở một trang đặt gần trong thư mục định tuyến dưới dạng `_components/`.
- Quy tắc nghiệp vụ (tính toán tiền, máy trạng thái, thuật toán phân công) phải nằm ở `src/lib/` hoặc `src/server/`, **nghiêm cấm rải rác trong trang React**.

---

## 4. Quy ước đặt tên (generalized)

| Đối tượng | Kiểu | Ví dụ |
|---|---|---|
| Thư mục định tuyến | Chữ thường số nhiều tiếng Anh | `projects/`, `customers/`, `contracts/`, `finance/` |
| React component | PascalCase | `ProjectCard.tsx` |
| Hàm tiện ích | camelCase | `formatCurrency`, `computeReceivable` |
| Server Action | camelCase + động từ đầu | `createProject`, `closeContract` |
| Prisma model | PascalCase số ít | `Project`, `Customer`, `Contract` |
| Trường Prisma | camelCase | `contractNumber`, `createdAt` |
| Bảng DB (tự động) | snake_case | Kiểm soát bởi Prisma `@@map` |

**Cố định thuật ngữ (generalized)**:
- Vụ án/dự án/hợp đồng → `Project` / `Contract` / `Case`
- Khách hàng (tổ chức/cá nhân) → `Customer`
- Người liên hệ khách hàng → `Contact`
- Bên liên quan/đối tác/người thứ ba → `Party`
- Ghi chép thu/chi → `FeeEntry`
- Hóa đơn (hợp đồng/hóa đơn) → `Billing`
- Hạn chế → `Deadline` (có `category`: thanh toán, giao hàng, duyệt, thực hiện, khác)
- Người dùng hệ thống → `User`

---

## 5. Kỷ luật phát triển

1. **Sửa tài liệu ưu tiên hơn sửa code**. Khi yêu cầu hoặc quy định thay đổi, sửa `docs/` và file này trước, rồi mới viết implementation.
2. **Thứ tự module mới**: Data model → Types → Server Action → UI. Không được viết UI trước rồi bổ sung data.
3. **Quy tắc nghiệp vụ tập trung**. Máy trạng thái (chuyển đổi `Lead → Project`, nhảy vượt giai đoạn `Project`), tính toán tiền, xác định quyền hạn, nhất quán ở `src/lib/` hoặc `src/server/`, không viết trong React component.
4. **Không comment bỏ validation, bypass permission check, `@ts-ignore` cả khối** chỉ để code chạy. Tìm nguyên nhân gốc rễ.
5. **Key, token, password** không vào code, không vào commit, không vào log, không vào screenshot. `.env` luôn trong `.gitignore`.
6. **Prisma migration**: dùng `prisma migrate dev --create-only` tạo SQL để xem xét, rồi mới thực thi. Migration sản xuất dùng `prisma migrate deploy`.
7. **Xóa file, sửa `.env`/CI, `git reset/rebase/push`, triển khai sản xuất** phải xin chủ sở hữu dự án trước (đường đỏ).
8. **Tệp đính kèm** mặc định riêng tư trong `storage/`, tải qua API có xác thực, không lộ link công khai.

---

## 6. Quyền hạn và kiểm toán

- **Vai trò** (V1): `ADMIN` / `OWNER` / `MANAGER` / `STAFF` / `FINANCE`.
  - `ADMIN`: toàn quyền hệ thống, quản lý user, audit, xuất dữ liệu.
  - `OWNER`: chủ sở hữu/văn phòng, thấy tất cả dự án, phân công.
  - `MANAGER`: quản lý nhóm, thấy dự án của nhóm mình, duyệt đơn.
  - `STAFF`: thấy dự án được gán, tự mình không phân công.
  - `FINANCE`: thấy toàn bộ trường tài chính, không chỉnh sửa nội dung dự án.
- **Khả năng hiển thị**: `Project` mặc định chỉ thấy với `owner` + `members` + `ADMIN`; `FINANCE` thấy mọi trường tài chính của dự án nhưng không chỉnh sửa nội dung dự án.
- **Audit log** (`AuditLog`) phải ghi: đăng nhập/đăng xuất, tạo/xem/sửa/lưu trữ dự án, tải tài liệu, thay đổi tài chính, thay đổi quyền hạn.
- Phiên bản đầu **không làm ma trận quyền hạn cấp trường**, dùng "vai trò + thành viên dự án" bao phủ là đủ.

---

## 7. Lệnh xác thực (chạy mỗi lần sửa xong)

```bash
npm run lint              # ESLint CLI
npm run typecheck         # tsc --noEmit
npm run prisma:validate   # Kiểm tra schema Prisma
npm run build             # Build production (kiểm tra nghiêm ngặt nhất)
```

Thay đổi UI còn: trong trình duyệt chạy "đường vàng" (luồng công việc điển hình), không chỉ nhìn type/build.

Mỗi lần sửa còn phải xác nhận site cục bộ vẫn truy cập được: trước kiểm tra tiến trình lắng nghe cổng thuộc repo này, rồi mở `http://localhost:3000/login` hoặc trang liên quan. Nếu service đã dừng hoặc cổng không thuộc repo này, khôi phục/chuyển sang service đúng rồi xác thực lại trước khi giao hàng; không được chỉ báo cáo code validation pass.

---

## 8. An ninh đáy

- Tệp đính kèm riêng tư, link tải có token ngắn hạn.
- Thông tin khách hàng, số điện thoại, địa chỉ, số thuế, dữ liệu nhạy cảm: frontend hiển thị phải hỗ trợ chuyển đổi "che/mở rõ".
- Log không output PII (giá trị đầy đủ CMCD/CCCD, điện thoại, địa chỉ).
- `AuditLog` không được business code xóa, chỉ được lưu trữ.
- Mã hóa tệp đính kèm tùy chọn (AES-256-GCM), khóa từ biến môi trường, không lưu khóa trong DB.

---

## 9. Danh sách tài liệu

| Tệp | Vai trò |
|---|---|
| `AGENTS.md` (file này) | Sắt thép công việc khu vực, mọi cộng tác viên phải đọc |
| `docs/PRD.md` | Yêu cầu sản phẩm và phạm vi chức năng (tổng quát SMB) |
| `docs/DATA-MODEL.md` | Thiết kế chi tiết mô hình dữ liệu và ER diagram |
| `docs/UI-DESIGN.md` | Ngôn ngữ thiết kế, bảng màu, wireframe trang chính |
| `README.md` | Cửa nhà kho, hướng dẫn cài đặt chạy |
| `CHANGELOG.md` | Thay đổi phiên bản (tạo khi phát hành V1) |

---

## 10. Ghi chú đặc biệt cho AI trợ lý

- Mặc định trả lời **tiếng Việt**, code/trường/định tuyến dùng **tiếng Anh**.
- Kết luận trước, nếu phương án có vấn đề chỉ ra ngay.
- Liên quan **đường đỏ** (xóa file, sửa `.env`/CI, `git push`/`reset`/`rebase`, triển khai sản xuất, migration schema) **phải** xin đồng ý của chủ sở hữu dự án trước.
- Không nộp nhiều thay đổi chỉ để "trông bận rộn". Mỗi lần thay đổi nằm trong phạm vi có thể rà soát.
- Danh sách xác thực tự động ở mục 7 phải được thực hiện đầy đủ trước khi coi là xong nhiệm vụ.

---

*File này được viết lại để phục vụ mục tiêu tổng quát hóa: từ phần mềm quản lý vụ án luật师 thành ứng dụng quản trị đầy đủ cho công ty nhỏ và văn phòng độc lập bất kỳ ngành.*