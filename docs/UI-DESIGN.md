# LawLink — Tiêu chuẩn Thiết kế UI

> 版本: v0.2 (đã khóa phạm vi V1)
> Cập nhật: 2026-05-22
> Trạng thái: Đã xác nhận với chủ sở hữu (Yến)
> **Ghi chú**: tài liệu này viết lại tiếng Việt từ bản gốc.

---

## 一、Design language (Ngôn ngữ thiết kế)

**`Cảm giác công nghệ nhưng nghiêm túc`** — Công cụ cho người dùng chuyên nghiệp, không "game hóa", nhưng phải hiện đại, tiết chế, có chất lượng.

3 từ khóa:
1. **Dark-mode là chủ đạo**: nền xám–xanh đậm, gradient mờ, xem lâu không mỏi.
2. **Glassmorphism tiết chế**: chỉ thanh trên, modal, thẻ trọng tâm; danh sách/bảng thì không.
3. **Vi tương tác, không phun trào animation**: focus/hover/đổi trạng thái có hiệu ứng nhưng không quá 250ms.

Sản phẩm tham chiếu (để định hướng, không copy):
- **Linear**: mật độ thông tin + dark + sạch.
- **Vercel Dashboard**: khoảng trống + đường gradient.
- **Arc Browser Settings**: chất glass.
- **Anthropic Console**: cảm giác công nghệ tiết chế.

**Phản đề (tránh)**:
- ❌ Neon/đèn chớp kiểu cyberpunk.
- ❌ Lát thẻ sáng xếp chồng kiểu AntD/Element (bảng điều khiển tầm thường).
- ❌ Bo góc to + bóng đậm + nút gradient (phong cách Web3).

---

## 二、Bảng màu

Khai báo trong `tailwind.config.ts` và biến CSS ở `src/styles/globals.css`, dùng với theme shadcn/ui.

### 2.1 Chủ đề dark (mặc định)

```css
:root {
  /* Nền */
  --bg-base:        #0A0E1A;   /* tầng thấp nhất */
  --bg-elevated:    #111727;   /* thẻ / panel */
  --bg-overlay:     #1A2238;   /* thành phần nổi */
  --bg-glass:       rgba(20, 28, 48, 0.6); /* kính mờ */

  /* Viền */
  --border-subtle:  #1F2A44;
  --border-default: #2A3656;
  --border-strong:  #3D4D75;

  /* Chữ */
  --text-primary:   #E8ECF5;
  --text-secondary: #9BA8C7;
  --text-muted:     #5B6889;
  --text-disabled:  #3D4666;

  /* Màu nhãn hiệu & nhấn */
  --accent-primary: #5B8DEF;   /* "lý trí lam", màu thao tác chính */
  --accent-hover:   #7BA5F5;
  --accent-glow:    rgba(91, 141, 239, 0.25);
  --accent-cyan:    #4FD1C5;   /* nhấn phụ (đang chạy / thành công) */
  --accent-violet:  #9B7BF7;   /* chỉ cho tính năng AI */

  /* Trạng thái */
  --status-success: #4ADE80;
  --status-warning: #FBBF24;
  --status-danger:  #F87171;
  --status-info:    #60A5FA;

  /* Mức độ (xung đột / hạn) */
  --severity-low:      #4ADE80;
  --severity-medium:   #FBBF24;
  --severity-high:     #FB923C;
  --severity-blocking: #F87171;
}
```

### 2.2 Chủ đề sáng

`[data-theme="light"]` dự phòng; V1 mặc định ép dark (nút chuyển để sẵn nhưng khóa mờ).

### 2.3 Màu nhãn hiệu tuỳ chỉnh

`--accent-primary` mặc định `#5B8DEF`. Admin có thể đổi ở `/settings`:
- Lý trí lam `#5B8DEF` (mặc định)
- Vàng phiền tòa `#D4A453` (giàu truyền thống)
- Lục bảo `#3FB28F`
- Đỏ son `#E8694D` (chỉ cho văn phòng hình sự)

Hoặc nhập HEX. Hệ thống tự suy ra `--accent-hover` và `--accent-glow`; lưu trong `SystemSetting.appearance.primaryColor`.

### 2.4 Quy tắc dùng màu

- **Thao tác chính** chỉ dùng `--accent-primary`; mỗi trang tối đa 1 nút chính.
- **Màu trạng thái** chỉ dùng cho huy hiệu/thông báo, **không** trang trí.
- **Thao tác nguy hiểm** (xóa/lưu trữ): phong cách outline + viền danger, không dùng nút đặc đỏ.
- **Mức độ** `severity-*` chỉ dùng trong mô-đun rủi ro/hạn.

---

## 三、Typo (Phông chữ)

```css
--font-sans:  "Inter", "PingFang SC", -apple-system, sans-serif;
--font-mono:  "JetBrains Mono", "SF Mono", Consolas, monospace;
--font-serif: "Noto Serif SC", "Source Han Serif", serif; /* chỉ khi hiển thị văn bản pháp lý */
```

| Mục đích | Class | Size | Weight |
|---|---|---|---|
| Tiêu đề trang H1 | `text-2xl font-semibold` | 24px | 600 |
| Tiêu đề khối H2 | `text-lg font-medium` | 18px | 500 |
| Đầu cột bảng | `text-xs uppercase tracking-wider` | 12px | 500 |
| Nội dung | `text-sm` | 14px | 400 |
| Chú thích | `text-xs text-muted` | 12px | 400 |
| Số tiền | `font-mono tabular-nums` | 14–16px | 500 |
| Mã/ số án | `font-mono` | 13px | 400 |

---

## 四、Khoảng cách & Bo góc & Bóng

| Hạng mục | Giá trị | Áp dụng |
|---|---|---|
| Đơn vị khoảng cách | Tailwind 4px | `gap-2=8px`, `gap-4=16px` |
| Lề trang | `px-8 py-6` | Vùng nội dung chính |
| Padding thẻ | `p-5` | 20px |
| Bo góc nhỏ | `rounded-md` (6px) | Input, huy hiệu |
| Bo góc trung | `rounded-lg` (8px) | Nút, thẻ |
| Bo góc lớn | `rounded-xl` (12px) | Modal, panel |
| Bóng thẻ | `shadow-[0_0_0_1px_var(--border-subtle)]` | Dùng viền thay bóng |
| Bóng nổi | `shadow-lg shadow-black/40` | Chỉ modal / dropdown |

**Ràng buộc then chốt**: dưới dark **hạn chế bóng, ưu tiên viền**, tránh cảm giác "bẩn".

---

## 五、Chọn thư viện component

| Nhóm | Chọn | Nguồn |
|---|---|---|
| Nền tảng | shadcn/ui | `npx shadcn@latest add button` theo nhu cầu |
| Icon | lucide-react | Đồng nhất phong cách tuyến tính |
| Form | React Hook Form + Zod | An toàn kiểu |
| Bảng | TanStack Table v8 | Cuộc ảo nhanh |
| Ngày | dayjs + react-day-picker | DatePicker shadcn |
| Văn bản giàu (V1.5) | TipTap | Cho Note/Ghi chép |
| Biểu đồ | Recharts | Thống kê tài chính |
| Hiệu ứng | Framer Motion | Chỉ chuyển trang + phản hồi then chốt |
| Toast | sonner | Thông báo |

**Danh sách shadcn/ui cần cài (V1)**:
`button input textarea select dialog dropdown-menu tabs card badge table sheet command popover tooltip toast avatar separator skeleton scroll-area progress alert calendar form label checkbox switch`

---

## 六、Hệ bố cục

### 6.1 Vỏ ứng dụng AppShell

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar  64px  kính mờ + viền đáy mờ                          │
├──────┬──────────────────────────────────────────────────────┤
│      │                                                       │
│ Side │                        Main                           │
│ bar  │                                                       │
│ 240  │                                                       │
│  px  │                                                       │
└──────┴──────────────────────────────────────────────────────┘
```

- **Topbar**: trái Logo + breadcrumb; phải tìm kiếm `⌘K` + thông báo + menu avatar.
- **Sidebar**: các mục cấp 1 (Bảng làm việc / Dự án / Khách hàng / Tài chính / Lịch / Cài đặt); mục đang mở có dải sáng 2px bên trái.
- **Main**: padding 32×24, rộng tối đa 1440px căn giữa.

### 6.2 Responsive

| Điểm ngắt | Hành vi |
|---|---|
| < 1024px | Sidebar thu thành icon |
| < 768px | V1 chưa tối ưu sâu (chủ yếu desktop), chỉ cần không vỡ |

### 6.3 Ngăn kéo vs Trang đầy đủ

| Trường hợp | Hình thức |
|---|---|
| **Tạo mới** (lead/dự án/khách hàng/ghi chép/nhiệm vụ/thu chi) | Ngăn kéo phải `Sheet` |
| **Sửa** đơn giản (trạng thái/ghi chú/tag) | Sửa tại chỗ / popover dòng |
| **Sửa** phức tạp (thông tin dự án/hợp đồng) | Vào trang đầy đủ |
| **Xem** dự án/khách hàng/chi tiết giai đoạn | Trang đủ URL, chia sẻ được |
| **Xem** dữ liệu nhỏ chỉ đọc (1 Note/Task) | `Popover` |
| **Kết quả đánh giá rủi ro** | Trang + ngăn kéo lẫn lộn |

**Quy tắc ngăn kéo**:
- Rộng mặc định `max-w-2xl`; form nhiều trường `max-w-3xl`.
- Đóng bằng `Esc` / che màn / `×` / tự đóng sau khi lưu.
- Chưa lưu mà thoát: xác nhận.

---

## 七、Wireframe các trang trọng điểm

### 7.1 Bảng làm việc `/` (bố cục 4 khối dọc)

```
① Hero  ── ② KPI × 4  ── ③ Lịch sắp tới + Việc cần xử lý  ── ④ Hai biểu đồ
```

- **① Hero (~140px)**: lời chào + ngày; nút "Tạo mới tiếp nhận"/"Đánh giá rủi ro"; thẻ "Tiêu điểm hôm nay" (đếm ngược tới hạn).
- **② KPI × 4 (~120px)**: 4 thẻ + sparkline 14 ngày + trend.
- **③ Lịch + Việc cần xử lý (~360px, 60/40)**: dòng thời gian trái; hàng chờ phải, sắp theo mức độ.
- **④ Biểu đồ (~280px, 60/40)**: xu hướng thu nhập 6 tháng + vòng phân bố loại công việc.

**Điểm nhìn**:
- Nền trang: `--bg-base` phủ thêm gradient xuyên tâm cực mờ (góc trên phải, 5% màu chủ).
- Thẻ: nền `--bg-elevated` + viền 1px `--border-subtle`; hover viền `--border-default`.
- Thẻ "Tiêu điểm": glass + viền trong 12% + glow 25% màu chủ.
- Số tiền/đếm ngược: `font-mono tabular-nums` chống nhảy.
- Vào trang: 4 khối stagger 60ms (framer-motion).
- Không có dữ liệu: 4 bản minh hoạ đơn giản, không để trống trơn.

### 7.2 Danh sách dự án `/matters`

Bảng có lọc đầu cột (loại / trạng thái / phụ trách / ngày), tìm kiếm, nút "Tạo mới"; chấm trái = mức độ (đỏ chặn / cam cận / xanh bình thường).

### 7.3 Chi tiết dự án `/matters/[id]`

Tab cấp 1: Tổng quan / Tài liệu & dữ liệu / Từng giai đoạn (ENGAGED) × N / Dòng thời gian. Thẻ "Hạn & Hẹn" gộp toàn bộ giai đoạn ENGAGED.

### 7.4 Đánh giá rủi ro `/conflicts/new`

Nhập tên/mã định danh; kết quả phân cấp `LOW/…/BLOCKING`; nút "Xem", "Cùng chủ thể", "Khác chủ thể", "Cần thêm thông tin".

### 7.5 Ngăn kéo tạo dự án (Sheet, `max-w-3xl`)

- Chọn **loại hình** → các trường động theo loại.
- Các khối: Bên liên quan / Thời gian & Người / Giai đoạn & Vị thế / Loại việc / Giá trị–phí / Đội ngũ.
- Nút chọn dạng toggle; selected = nền chủ 30% + viền chủ + glow 8px.
- Lỗi: viền đỏ + chữ đỏ dưới trường (không toast).
- Đóng: nếu có thay đổi → xác nhận. Tạo xong: đóng ngăn, chèn dòng mới ở đầu danh sách + highlight 1.5s.

---

## 八、Vi tương tác — mô phỏng tương tác

| Tương tác | Cách làm |
|---|---|
| Bảng lệnh `⌘K` | shadcn `Command` |
| Hover dòng bảng | Nền `--bg-overlay` + dải sáng 2px |
| Số chạy | KPI count-up 400ms |
| Đổi trạng thái | Nút nhún nhẹ + huy hiệu cross-fade |
| Mở ngăn | `Sheet` trượt 200ms + nền `bg-glass` hiện dần |
| Lỗi form | Viền đỏ + lắc 8px 1 lần |
| Toast | sonner góc phải, 4s tự tắt, xếp chồng được |
| Skeleton | Tải danh sách/chi tiết dùng `Skeleton`, không spinner |

**Cấm**:
- ❌ Không đặt hiệu ứng hover cho dòng bảng (rẻ tiền + chậm).
- ❌ Không đổi kích thước nút khi hover (chỉ đổi màu/viền).
- ❌ Không tô nút bằng gradient.

---

## 九、Accessibility (Khả năng tiếp cận)

- Tương phản chữ tối thiểu 4.5:1 (WCAG AA).
- Mọi tương tác focus được bằng bàn phím; thứ tự `Tab` hợp lý.
- Thao tác then chốt có `aria-label`.
- Focus ring: `outline-2 outline-offset-2 outline-accent`.

---

## 十、Quyết định đã khóa

| # | Quyết định | Thực thi |
|---|---|---|
| 1 | Trang chủ dùng Hero + KPI + Lịch/Todo + 2 biểu đồ (không "luồng") | §7.1 |
| 2 | Tạo = ngăn phải; sửa phức tạp/xem = trang đủ; xem nhỏ = Popover | §6.3 |
| 3 | Màu mặc định "lý trí lam"; admin đổi được; sáng tối V1.5 | §2.2/§2.3 |
| 4 | Dark ưu tiên; bóng yếu + viền mạnh; tiền/mã dùng `tabular-nums` | §四 |
| 5 | Vi tương tác ≤ 250ms; dòng bảng không hover | §八 |

---

## 十一、Danh sách "Stage 1" để cài đặt theo thứ tự

1. `npm uninstall antd @ant-design/icons`; dọn mã chiếm chỗ trong `src/app/**`.
2. Cài: `tailwindcss postcss autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `framer-motion`, `recharts`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner`.
3. `npx shadcn@latest init` (dark + Slate) → `add` theo mục 五.
4. Khai báo biến CSS ở `src/styles/globals.css` theo §二.
5. Viết `src/components/layout/AppShell.tsx` (Sidebar + Topbar).
6. Viết trang chủ `/` theo §7.1, dùng mock trước.
7. Chạy `npm run lint && typecheck && build`.

> Các lệnh ở mục này mang tính tham khảo từ bản gốc; thư viện trong dự án hiện đã cài sẵn phần lớn. Không chạy `uninstall` trừ khi được duyệt (AGENTS.md đỏ-vạch).

---

*Tài liệu này viết lại bằng tiếng Việt, bám sát UI-DESIGN gốc và các quyết định đã khóa. Khi đổi phong cách, sửa file này trước rồi mới đổi code.*
