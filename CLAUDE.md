# ALL3 — BẢCH KHOA TOÀN THỨ PHÁT TRIỂN ỨNG DỤNG CODE PRODUCTION-GRADE

Tệp này tổng hợp toàn bộ tri thức, quy tắc, kiến trúc, chuẩn mực và quy trình phát triển phần mềm cần thiết để xây dựng, duy trì, kiểm thử, đánh giá và triển khai ứng dụng doanh nghiệp. Đây là nguồn sự thật duy nhất. Không tham khảo tài liệu ngoài, không trích dẫn file khác, không chứa mã nguồn dài dòng. Nội dung dùng trực tiếp để phát triển code app.

---

## PHẦN 1: TỔNG QUAN HỆ THỐNG PHÁT TRIỂN

### 1.1 Bản chất
Hệ thống phát triển này chạy hoàn toàn trên các nguyên tắc ghi vào tài liệu. Mọi vòng phát triển phải tự cải thiện, tự kiểm toán, tự xác minh trước khi chuyển sang vòng mới. Ứng dụng phải ngày càng hoàn thiện hơn, không bao giờ thu hẹp phạm vi hoặc xóa mã để đạt mục tiêu nhanh.

### 1.2 Nguyên cốt
**Missing Code = Write More.** Nếu thiếu gì thì viết thêm. Không bỏ sót, không xóa mã, không giảm độ phức tạp cần thiết. Mỗi vòng phát triển phải làm ứng dụng chắc chắn hơn, rõ ràng hơn, an toàn hơn.

### 1.3 Chu kỳ phát triển bắt buộc
Phân tích → Giải thích → Lập kế hoạch → Viết test thất bại → Triển khai → Tái cấu trúc → Tối ưu hóa → Kiểm toán → Xác minh (lặp lại cho đến khi đạt mục tiêu). Không được dừng sớm. Mọi tác vụ phải có tiêu chí thành công có thể đo lường.

---

## PHẦN 2: CHẤT LƯỢNG MÃ & CỔNG CHẤT LƯỢNG (QUALITY GATE)

### 2.1 Điểm số chất lượng tối thiểu (≥90/100)

| Tiêu chí | Ngưỡng |
|----------|--------|
| Hàm logic nghiệp vụ | ≤ 20 dòng |
| Hàm giao diện người dùng | ≤ 50 dòng |
| Độ phức tạp vòng tròn (cyclomatic complexity) | ≤ 10 |
| Dòng mã trùng lặp liên tiếp | Không quá 5 dòng |
| Xử lý lỗi cho API công khai | 100% |
| Xác thực đầu vào từ bên ngoài | 100% |
| Mật mã cứng (hardcoded secrets) | Không có |
| Có thể kiểm thử (không gọi trực tiếp DB/mạng trong logic nghiệp vụ) | Có |
| Phần trăm phủ test trên CI | ≥ 80% |
| Tất cả bài test pass | Có |

Nếu bất kỳ mục nào không đạt → từ chối commit, tự động hoàn tác.

### 2.2 Mười hai mẫu thiết kế xấu (Anti-Patterns) cần tránh

1. **God Object**: một đối tượng quá 300 dòng hoặc quá 10 phương thức.
2. **Arrow Code**: độ lồng nhánh quá 3 cấp.
3. **Magic Constants**: hằng số ma thuật không được đặt tên rõ ràng.
4. **Shotgun Surgery**: cùng một logic trùng lặp quá 2 nơi.
5. **Circular Dependency**: A phụ thuộc B, B phụ thuộc A.
6. **Deep Inheritance**: kế thừa quá 2 cấp.
7. **Feature Envy**: truy cập dữ liệu của đối tượng khác quá 3 lần.
8. **N+1 Queries**: gọi cơ sở dữ liệu bên trong vòng lặp.
9. **Blocking I/O trong async**: thao tác I/O chặn trong ngữ cảnh không đồng bộ.
10. **O(n²)**: thuật toán bội phần.
11. **Unbounded Cache**: bộ nhớ đệm không giới hạn kích thước.
12. **Sync Rate Limiting**: giới hạn tần suất theo cách chặn trong vòng nóng.

**Cách khắc phục:** Trích xuất mã, mệnh đề bảo vệ, hằng số có tên, trách nhiệm đơn nhất, giao diện, kết hợp, thao tác nguyên tử, TTL, thùng chữ nhật mã thông báo.

### 2.3 Danh sách kiểm tra Teufel (Devil's Advocate)
- Các chế độ hỏng: timeout, khóa chết, hết bộ nhớ, ngoại lệ không xử lý.
- Quy mô: O(n), bộ nhớ tuyến tính, chỉ mục cơ sở dữ liệu, 1 triệu người dùng.
- Bảo mật: chèn SQL, XSS, chèn lệnh, leo thang đặc quyền.
- Thiết kế quá mức, thiếu trường hợp biên, tên gọi kém.
- Gọi cảnh báo: bão cảnh báo, bão thử lại, sự cố lan truyền.
- SLO: p99 dưới 200ms, tỷ lệ lỗi dưới 0.1%, sẵn sàng 99.9%.

### 2.4 Thông báo lỗi chuẩn
- Định dạng: `[ERROR] Thành phần Hành động - Lý do - Gợi ý`.
- Danh mục: ValidationError, NotFoundError, ConflictError, PermissionError, ExternalError, TimeoutError, QuotaExceededError.
- Cho người dùng: rõ ràng, có hành động, không stack trace/SQL/internal.
- Cho phát triển/nhật ký: ngữ cảnh đầy đủ (request ID, user ID, stack, payload, correlation ID).
- Sẵn sàng dịch quốc tế, có gợi ý khôi phục.

---

## PHẦN 3: KIẾN TRÚC BACKEND

### 3.1 Clean Architecture
Quy tắc phụ thuộc: lớp bên ngoài phụ thuộc vào lớp bên trong (bằng giao diện trừu tượng).

```
Delivery (handler HTTP/gRPC)
    ↓
Use Case (dịch vụ ứng dụng)
    ↓
Domain (thực thể, giao diện kho lưu trữ, quy tắc nghiệp vụ)
    ↓
Infrastructure (cơ sở dữ liệu, bộ nhớ đệm, dịch vụ bên ngoài)
```

- Repository pattern với giao diện.
- Đảo ngược phụ thuộc dựa trên giao diện.

### 3.2 Modular Monolith
- Một bản phát hành, một tiến trình, một cơ sở dữ liệu.
- Độc lập mô-đun (ranh giới code, dữ liệu, sự kiện).
- App Core: khởi tạo, điều phối, giao dịch.
- Nền tảng nền (Platform Layer): IAM, MDM, sự kiện, cấu hình.
- Giao tiếp giữa mô-đun: sự kiện + App Core facade (không gọi trực tiếp).

### 3.3 Go Backend
Cấu trúc thư mục: `cmd/`, `internal/`, `pkg/`, `deployments/`, `scripts/`.

- Delivery: bộ xử lý HTTP mỏng, ủy nhiệm cho usecase.
- Domain: thực thể và giao diện kho lưu trữ.
- UseCase: dịch vụ ứng dụng, kiểm tra nghiệp vụ.
- Infrastructure: kho lưu trữ PostgreSQL, bộ nhớ đệm Redis, nhật ký có cấu trúc.
- Quan sát: chỉ số Prometheus, kiểm tra sức khỏe, truy vết OpenTelemetry.
- Khả năng phục hồi: hủy ngữ cảnh (context cancellation), thử lại với backoff.
- Kiểm thử: bảng chạy thử, giả lập.
- Cấm: biến toàn cục, hàm khởi tạo cho logic nghiệp vụ, panic trong production.

### 3.4 Python Backend
Khung làm việc: FastAPI (không đồng bộ, Pydantic, tạo OpenAPI tự động) hoặc Django (đầy đủ pin).

Cấu trúc thư mục: `app/main.py`, `config.py`, `database/`, `models/`, `schemas/`, `repositories/`, `services/`, `api/`, `middleware/`, `tests/`.

- Kiểu dữ liệu khắp nơi (mypy nghiêm ngặt), xác thực Pydantic.
- SQLAlchemy không đồng bộ hoặc Django ORM.
- Repository pattern (khuyến khích).
- Nhật ký có cấu trúc (structlog), pytest với fixture.
- Di trệ: Alembic hoặc Django migrations.
- Nhiệm vụ nền: Celery + Redis.
- Cận vi: Docker sẵn sàng triển khai.
- Cấm: trạng thái toàn cục, tham số mặc định có thể thay đổi, bắt ngoại lệ trống, in ra màn hình thay vì nhật ký.

### 3.5 Rust Backend
Triết lý: Zero-cost abstractions, fearless concurrency, memory safety without garbage collector.

- Thời gian chạy không đồng bộ: Tokio.
- Xử lý lỗi: `Result<T,E>` khắp nơi, toán tử `?`, không panic/unwrap trong production.
- Xác thực truy vấn thời gian biên dịch: sqlx.
- Quan sát: tracing, Prometheus metrics, OpenTelemetry.
- Repository pattern với đặc tính (trait).
- Kiểm thử: mockall, bảng chạy thử.
- CI/CD: cargo clippy, fmt, test, audit.
- Cấm: panics, unwrap(), khối unsafe trừ khi bắt buộc.

### 3.6 .NET Backend
Modular Monolith: một bản phát hành, một tiến trình, một cơ sở dữ liệu.

- Giao diện `IModule`: Tên, Phiên bản, Đăng ký dịch vụ, Cấu hình phụ thuộc.
- Khám phá mô-đun: quét lắp ráp, bản kê mô-đun, hoặc quy ước.
- Nền tảng nền: IAM, MDM, sự kiện, cấu hình (chỉ để lộ trừu tượng).
- Giao tiếp giữa mô-đun: sự kiện + App Core facade.
- Giao dịch: UnitOfWork pattern, một DbContext = một giao dịch.
- Kiểm tra sức khỏe mỗi mô-đun.
- Cấm: khung làm việc ma thuật, Service Locator, trạng thái có thể thay đổi toàn cục tĩnh, phụ thuộc tròn.

---

## PHẦN 4: KIẾN TRÚC FRONTEND

### 4.1 Thiết kế nguyên tử (Atomic Design)
- **Atoms:** Nút bấm, trường nhập, biểu tượng, nhãn, huy hiệu, chip...
- **Molecules:** Nhóm trường nhập, thẻ, cửa sổ modal, cảnh báo, phân trang, thanh tìm kiếm...
- **Organisms:** Thanh tiêu đề, thanh bên, bảng dữ liệu, bảng lọc...
- **Templates:** Bố cục xác thực, bố cục bảng điều khiển, bố cục modal...
- **Pages:** Dùng template, không viết giao diện trực tiếp.

Cấu trúc thư mục:
```
frontend/
├── components/{atoms,molecules,organisms}/
├── features/{feature}/
├── templates/
└── pages/
```

Quy tắc: trang dùng thư viện thành phần (không inline UI). Tính năng tổ chức theo miền. Thành phần chung không chứa logic nghiệp vụ.

### 4.2 Angular v17+
- Một gói, một ứng dụng, một bộ định tuyến (không micro-frontend, không module federation).
- Mỗi tính năng một module miền backend (ánh xạ 1-1), nạp chậm (lazy-loaded).
- Core = hạ tầng chỉ, không logic nghiệp vụ.
- Shared = giao diện chỉ, không trạng thái, không API.
- Trạng thái = tính năng cục bộ (Angular Signals), không kho lưu trữ toàn cục.
- Giao tiếp giữa tính năng: Tín hiệu + Dịch vụ Core (không import trực tiếp).
- Hiệu năng: khối @defer.
- Ranh giới thời gian biên dịch: tsconfig paths + ESLint.
- Thành phần độc lập (standalone), bộ định tuyến Angular nạp chậm.

### 4.3 React v18+
- Thành phần hàm + Hooks, TypeScript nghiêm ngặt.
- Trạng thái: trạng thái thành phần + Context (ít hơn 10 người tiêu dùng) + React Query/SWR (trạng thái máy chủ).
- Không Redux/Recoil (quá thừa), không thành phần lớp.
- Định tuyến: React Router v6 + `React.lazy()` + `Suspense`.
- Hiệu năng: `React.memo`, `useMemo`, `useCallback`, danh sách ảo.
- Kiểm thử: Jest + RTL + Playwright.
- Cấm: `any` (dùng `unknown`), thành phần lớp, Redux/Recoil trừ khi bắt buộc.

---

## PHẦN 5: KIẾN TRÚC FULLSTACK ERP

- Một gói giao diện + một bản phát hành backend + một cơ sở dữ liệu.
- Ánh xạ 1-1 giữa module backend và tính năng giao diện.
- Backend: App Core + Nền tảng (IAM/MDM/Eventing/Config) + Các mô-đun miền.
- Giao diện: Core (hạ tầng chỉ) + Shared (giao diện chỉ) + Tính năng (nạp chậm).
- API: REST + sự kiện không đồng bộ.
- Cơ sở dữ liệu: một cơ sở dữ liệu, các lược đồ/tiền tố riêng biệt.
- Triển khai: 1 giao diện + 1 backend + 1 cơ sở dữ liệu.

Ánh xạ ví dụ:
- Quản lý người dùng ↔ Tính năng người dùng
- Tài chính ↔ Tính năng tài chính
- Bán hàng ↔ Tính năng bán hàng
- Kho hàng ↔ Tính năng kho hàng

---

## PHẦN 6: NỀN TẢNG IAM (IAM Platform Layer)

| Dịch vụ | Nhiệm vụ |
|---------|----------|
| `IUserContext` | Thông tin người dùng hiện tại (userId, vai trò, quyền hạn, tenantId, claims) |
| `IAuthorizationService` | Kiểm tra quyền hạn/vai trò/chính sách |
| `IAuthenticationService` | Đăng nhập, đăng xuất, quản lý mã thông báo |
| `ISessionManager` | Chu kỳ phiên làm việc, thời gian chờ, thu hồi |

Triển khai: `HttpContextUserContext` (thời gian chạy), `NullUserContext` (di trệ), `SystemUserContext` (nhiệm vụ nền).

Xác thực: JWT (RS256/HS256) + mã thông báo làm mới, mã truy cập ngắn hạn (15-30 phút), mã làm mới dài hạn (7-30 ngày), khóa API cho dịch vụ đến dịch vụ.

Đa người thuê: TenantId từ mã thông báo/header/tên miền phụ, lược đồ/tiền tố riêng hoặc RLS.

Kiểm tra: Nhật ký tất cả sự kiện xác thực (đăng nhập, đăng xuất, đổi mật khẩu, thu hồi phiên...).

Quy tắc: Nền tảng IAM không chứa logic nghiệp vụ, không gọi mô-đun miền trực tiếp.

---

## PHẦN 7: MẪU CƠ SỞ DỮ LIỆU — 4 BƯỚC

Khi thêm/sửa thực thể, tuân thủ thứ tự:

1. **Dịch vụ:** Tiêm giao diện kho lưu trữ (không tiêm DbContext trực tiếp).
2. **Giao diện kho lưu trữ:** Khai báo trong `Domain/Repositories.cs`.
3. **Triển khai kho lưu trữ:** Trong `Infrastructure/Repositories.cs`, dùng DbContext.
4. **Thực thể + Cấu hình + DbSet:**
   - 4a. Thực thể trong `Domain/Entities.cs`.
   - 4b. Cấu hình thực thể trong `Infrastructure/EntityConfigurations/`.
   - 4c. DbSet trong `ErpDbContext`.

Cấm: Dịch vụ tiêm DbContext trực tiếp, truy vấn DbContext entity trực tiếp trong dịch vụ.

---

## PHẦN 8: KIỂM THỬ & ĐÁNH GIÁ CHẤT LƯỢNG

### 8.1 Nguyên tắc tạo bài kiểm thử
- Giả lập phụ thuộc bên ngoài, kiểm thử logic thuần.
- Bài kiểm thử <100ms, xác định trước.
- Bao gồm: hợp lệ, null/undefined, ranh giới, bị hỏng.
- Phần trăm phủ: nhánh trên CI ≥80%.
- Mỗi API công khai ≥1 bài kiểm thử.
- Cấu trúc: `describe → it` (AAA).
- Unit = logic nghiệp vụ; Integration = hợp đồng dịch vụ; E2E <10% tổng bộ kiểm thử.

### 8.2 Phân tích trước (bắt buộc trước khi viết kiểm thử)
- **Bản xuất khẩu:** mọi hàm/lớp/phương thức công khai/kiểu được xuất khẩu.
- **Hợp đồng hành vi:** đầu vào/đầu ra/phương tác phụ/goi gọi bên ngoài/lỗi có thể xảy ra.
- **Bản nhánh:** mọi if/else/switch/trả về sớm/ném/bắt/đường đi từ chối không đồng bộ.

Nếu thiếu thông tin → DỪNG và báo: "Không thể tạo kiểm thử vì: <thiếu thông tin chính xác>".

### 8.3 Quy tắc kiểm thử đầy đủ
- Mọi đầu vào đều có thể sai / mọi phụ thuộc đều có thể thất bại / mọi lời gọi không đồng bộ đều có thể hết thời gian / mọi dữ liệu đều có thể bị hỏng.
- Nếu nhánh/hành vi/tình huống không thể kiểm thử → liệt kê `[KHÔNG THỂ KIỂM THỬ: lý do chính xác]`.
- Không bỏ sót lặng lẽ.

### 8.4 Định dạng đầu ra kiểm thử
1. Bảng phủ nhánh (File→hàm→nhánh→tên bài kiểm thử).
2. Bản đồ phủ kiểm thử (File→tất cả hành vi đang được kiểm thử).
3. Cấu trúc thư mục (cây thư mục kiểm thử đầy đủ).
4. Mã kiểm thử đầy đủ (không lược bỏ).
5. Chiến lược giả lập (đúng giả lập gì và tại sao).
6. Chiến lược tích hợp (đúng thực tế gì và bịch đính gì, tại sao).

Cơ sở dữ liệu tích hợp: SQLite trong bộ nhớ, lược đồ mới mỗi lần chạy bài kiểm thử, dữ liệu đầu vào trong mỗi bài kiểm thử.

### 8.5 Kích hoạt tái cấu trúc theo phần trăm phủ
- Nhánh <70% → TÁI CẤU TRÚC.
- 0% phủ → MÃ CHẾT hoặc CHƯA ĐƯỢC KIỂM THỬ.
- Xử lý lỗi <80% → UYÊN TIẾN CAO.
- Điều kiện không được phủ đầy đủ → thiếu nhánh hoặc mã chết.

Ưu tiên: mã chết → đường đi lỗi chưa kiểm thử → hàm phức tạp → API công khai <80%.

---

## PHẦN 9: KIỂM TOÁN HỆ THỐNG — 10 CHỈ TIÊU

Khi kiểm toán cơ sở code trước khi đưa ra hoạt động, kiểm tra TẤT CẢ 10 dimensi:

1. **Độ toàn vẹn logic nghiệp vụ:** có thể bỏ qua xác thực, thao túng đầu vào từ khách hàng, trường hợp biên, giả định nguy hiểm, phụ thuộc ngầm. Mô tả khai thác nếu có.
2. **Kiểm tra luồng đầu cuối:** Khách hàng → API → Dịch vụ → Cơ sở dữ liệu → Bộ nhớ đệm → Hàng đợi → Nhân viên xử lý → Dịch vụ bên ngoài → Phản hồi. Tìm luồng bị ngắt, không hoàn tác, thất bại lặng lẽ, thiếu xử lý lỗi, sızı bộ nguyên.
3. **Điều kiệnpia & trạng thả đua:** 2 yêu cầu cùng lúc, 100 yêu cầu song song, nhiều tab, thử lại, nhiệm vụ nền song song. Xác định cập nhật bị mất, thực thi hai lần, ghi bẩn, không nguyên tử, thiếu khóa.
4. **Cơ sở dữ liệu & toàn vẹn dữ liệu:** Giao dịch? Mức độ cô lập? Rủi ro khóa chết? Ràng buộc duy nhất? Khóa ngoại đầy đủ? Dữ liệu mồ côi? Trạng thái không nhất quán?
5. **Bộ nhớ đệm & sự nhất quán:** Hủy bỏ bộ nhớ đệm đúng? Bộ nhớ đệm cũ? Thôn lại bộ nhớ đệm? Sự không nhất quán phân tán? Cập nhật bộ nhớ đệm trước khi cơ sở dữ liệu cam kết?
6. **Tính idempotent:** Điểm cuối idempotent? Thử lại gây hai lần? Webhook chạy hai lần? Nhiệm vụ nền xử lý trùng? Triển khai: khóa idempotent header, ràng buộc duy nhất trên operation_id.
7. **Các kịch bản thất bại:** Cơ sở dữ liệu hỏng giữa giao dịch, API bên ngoài hết thời gian, nhân viên hỏng, phân vùng mạng, ổ đĩa đầy, đột phát bộ nhớ, đột phát CPU, hàng đợi chập chờn. Mô tả phản ứng, khôi phục tự động, hỏng dữ liệu, dự phòng.
8. **Kiểm tra bảo mật (STRIDE+DREAD):** Xác thực đầu vào, mã hóa đầu ra, chèn SQL/NoSQL, XSS, CSRF, SSRF, kiểm soát truy cập bị hỏng, xác thực JWT, chữ ký webhook, tấn công đánh lại. DREAD ≥7 → sửa ngay.
9. **Phân tích quy mô:** O(n)? Truy vấn N+1? Rò rỉ bộ nhớ? I/O chặn? Khơi cháy luồng? Chặn vòng lặp sự kiện? Khai thác ngang an toàn? Trạng thái chung an toàn luồng? Chuẩn đoán: p50<100ms, p99<200ms.
10. **Quan sát & theo dõi:** Nhật ký đầy đủ? PII trong nhật ký? Chỉ số quan trọng? Cảnh báo khi thất bại? Kiểm tra sức khỏe? Mã quan hệ quan sát? Truy vết phân tán?

### Mẫu báo cáo kiểm toán
- Tóm tắt giám đốc: rủi ro tổng thể, số lượng nghiêm trọng/cao/trung bình/thấp, thời gian sửa.
- Chi tiết phát hiện: mức độ, vị trí, cách khai thác, hậu quả, cách sửa chi tiết, bài kiểm thử cần thêm, ưu tiên.
- Kiểm tra tuân thủ: GDPR, PCI-DSS, SOC2.
- Khoảng trống quan sát: thiếu nhật ký, chỉ số, cảnh báo.
- Khuyến nghị: P0-P3 được ưu tiên.
- Ký tên: Đội bảo mật, Đội SRE, Trưởng kỹ thuật.

### Ma trận ưu tiên sửa (P0-P3)
| Mức độ | Dễ khôi phục | Ưu tiên |
|--------|--------------|---------|
| Nghiêm trọng | Dễ | P0 - Ngay lập tức |
| Nghiêm trọng | Khó | P0 - Lập kế hoạch |
| Cao | Dễ | P1 - Sprint này |
| Cao | Khó | P1 - Sprint tiếp theo |
| Trung bình | - | P2 - Danh sách chờ |
| Thấp | - | P3 - Tùy chọn |

Điểm số tự đánh giá kiểm toán ≥90/100 bắt buộc. Phạt -30 nếu kiểm toán không đầy đủ hoặc bỏ lỡ vấn đề nghiêm trọng.

### Bài kiểm thử bắt buộc (mỗi vấn đề phát hiện)
Kiểm thử tải, kiểm thử điều kiệnpia, kiểm thử thử lại, kiểm thử hỗn loạn, đầu vào ranh giới, đầu vào bị harmful, giá trị ranh giới, kiểm thử áp lực, mô phỏng rò rỉ bộ nhớ, kiểm thử tích hợp (đầu cuối đầy đủ). Giả lập bên ngoài chỉ.

---

## PHẦN 10: HƯỚNG DẪN TRIỂN KHAI — 27 CỔNG

Nguyên tắc: Bộ tạo mã chỉ làm bước 0 (tạo phần tử mã chưa được tin cậy). Tất cả các bước còn lại tồn tại vì mã luôn nói dối cho đến khi được chứng minh là đúng.

**27 Cổng:**
0. Phần tử mã chưa được tin cậy
1. Vệ sinh nguồn
2. Đóng băng phụ thuộc
3. Xây dựng sạch
4. Xác minh phần tử
5. Phân tích mã tĩnh
6. Xác minh kiểu/lược đồ
7. Thực thi kiểm thử đơn vị
8. Cổng phần trăm phủ kiểm thử
9. Kiểm thử tích hợp
10. Kiểm thử hợp đồng
11. Xác thực di trệ dữ liệu
12. Quét bảo mật
13. Kiểm tra tuân thủ
14. Kiểm tra hiệu năng hợp lý
15. Kiểm thử áp lực/trường hợp biên
16. Kiểm thử chế độ thất bại
17. Xác thực quan sát
18. Xác thực cấu hình
19. Đóng gói
20. Triển khai sàng lọc
21. Kiểm thử khói
22. Kiểm thử hoàn tác
23. Cổng đánh giá con người
24. Ký tên
25. Cho phép git push
26. CI chạy lại tất cả cổng
27. Triển khai hoạt động

Khi nào dùng: sau khi bộ tạo mã hoặc lập trình viên tạo xong một vòng mã, trước khi push và triển khai hoạt động. Khi cần đảm bảo phần tử mã đã được kiểm chứng đầy đủ trước hoạt động. Khi muốn áp dụng chu kỳ kiểm soát chuẩn doanh nghiệp.

Không dùng khi: chỉ thay đổi văn bản/comment/tài liệu không ảnh hưởng mã chạy, chỉ thay đổi cấu hình không liên quan logic nghiệp vụ.

---

## PHẦN 11: KIỂM TRA CODE & VIBE CLEANER

### 11.1 Dấu hiệu mã "vibe" (do AI sinh nhanh)
- Tên biến mơ hồ: data1, resultX, temp, handler123, item, obj
- Logic trùng lặp, if/else vô nghĩa
- Hàm dài không cần thiết
- Nhiều comment nhưng không giải thích được
- Copy-paste thành phần/hàm

### 11.2 Nguyên tắc làm sạch (14 quy tắc)
1. Không tin mã là đúng (triết lý hỏi ngờ).
2. Phân tích miền (xác định ranh giới rõ ràng).
3. Mỗi hàm = một ý định (trách nhiệm đơn nhất).
4. Tái cấu trúc từng bước nhỏ (commit từng phần).
5. Xác thực sau mỗi thay đổi.
6. Đọc toàn bộ mã trước khi làm sạch.
7. Chuẩn hóa tên gọi (tên phản ánh ý nghĩa, không phải cách viết).
8. Kiểm soát rủi ro mã do AI sinh (bảo mật, hiệu năng, chính xác).
9. Tái cấu trúc có kiểm soát (kiểm soát phiên bản, thay đổi từng bước, sao lưu, kiểm thử sau mỗi thay đổi).
10. Trình bày tái cấu trúc (trước/sau, kiểm tra an toàn).
11. Kết luận cuối (báo cáo phần đã làm sạch, rủi ro còn lại, giả định kỹ thuật).
12. Giải quyết sự cố & gỡ lỗi: không xóa mã, đọc toàn bộ tệp, tìm gốc rễ, gỡ lỗi từng bước.
13. Kiểm tra giao diện & trải nghiệm người dùng: chất lượng thành phần, quản lý trạng thái, luồng dữ liệu, tên gọi.
14. Kiểm tra luồng đầu cuối: hành động người dùng, truyền lỗi, điều kiệnpia, trạng thái đang tải.

### 11.3 Báo cáo sẵn sàng hoạt động
```
✅ Kiểm thử trong đầu: [số] trường hợp đã pass
✅ Phủ luồng: UI→DB: [x], DB→UI: [y]
✅ Tình huống: [số] tình huống đã bao gồm
✅ Trường hợp biên: [số] trường hợp đã xử lý
✅ Mã thiếu: [số] hàm/thành phần đã thêm
✅ Tiêu chuẩn ngành: [x/y] tiêu chí đã đạt
⚠️  Vẫn còn thiếu: [liệt kê nếu có]
📝 Khuyến nghị: [nếu cần]
```

Cấm: nói "không cần kiểm thử" mà không kiểm thử trong đầu; bỏ sót chiều luồng; bỏ qua trường hợp biên; xóa mã thay vì thêm mã; nói "đã đủ" khi thực tế chưa đủ.

---

## PHẦN 12: LUỒNG TỰ ĐỘNG & AUTO-CONTINUE

### 12.1 Nguyên tắc cốt lõi
Đại lý tự động (JF Autonomous Agent) tự cải thiện cơ sở mã liên tục, không cần giám sát. Luồng bắt buộc: Phân tích → Giải thích → Lập kế hoạch → Viết test thất bại → Triển khai → Tái cấu trúc → Tối ưu hóa → Kiểm toán → Xác minh (lặp). Không được dừng sớm. Mọi tác vụ phải có tiêu chí thành công có thể đo lường.

### 12.2 Điều kiện dừng khẩn cấp
- Tỷ lệ lỗi >5% trong 10 phút.
- Bộ nhớ >90% liên tục >5 phút.
- Ổ đĩa <10%.
- Phụ thuộc ngoài gián đoạn >30 phút.

Khi dừng: ghi log vào AGENT_METRICS.md, hoàn tác batch cuối (`git revert HEAD~n`), cảnh báo, chờ can thiệp thủ công.

### 12.3 Các giai đoạn
1. **Khám phá & phân tích chủ động:** quét mỗi 2 giờ, cơ sở dữ liệu vi phạm (Bảo mật/Hiệu năng/Chất lượng/Kiểm thử/Thu nhập kỹ thuật), danh mục cải thiện (R→P→S→T→D→O→C→U→M).
2. **Lập kế hoạch:** chọn tác vụ ưu tiên cao nhất (CRITICAL → HIGH → SECURITY → PERFORMANCE → MEDIUM → LOW), kế hoạch vi mô ≤3 bước, mỗi bước ≤30 phút.
3. **Thực thi:** kiểm thử đầu tiên (red-green-refactor), không sửa mã không liên quan, khớp phong cách hiện có, cập nhật tài liệu, chạy `make quality`.
4. **Báo cáo & số liệu:** ghi vào AGENT_METRICS.md, AGENT_PROFILE.md, EVOLUTION.md.
5. **Lập lịch:** tối đa 3 tác vụ/ch kỳ, khám phá 2 giờ, ngủ 5 phút nếu hàng đợi trống.

### 12.4 Danh mục cải thiện
- **R**efactor: tách lớp/hàm lớn, trích xuất giao diện, giảm liên kết, áp dụng SOLID.
- **P**erformance: thêm bộ nhớ đệm, tối ưu truy vấn, nạp chậm, ghi nhớ.
- **S**ecurity: triển khai RBAC, thêm quy tắc WAF, mã hóa trường nhạy cảm, xoay khóa bí mật.
- **T**ests: tăng phần trăm phủ nhánh >85%, thêm kiểm thử ngẫu nhiên, thêm kiểm thử tích hợp.
- **D**ocumentation: cập nhật JSDoc, viết ADR, cải thiện README, thêm sơ đồ kiến trúc.
- **O**bservability: thêm truy vết phân tán, tạo chỉ số mới, cải thiện ngữ cảnh nhật ký.
- **C**ompliance: đảm bảo GDPR/PCI/HIPAA.
- **U**pgrade: cập nhật phụ thuộc, di trệ đến phiên bản chính mới, thay thế API lỗi thời.
- **M**odernization: di trệ đến không đồng bộ, TypeScript nghiêm ngặt, cải thiện CI/CD.

Định dạng tác vụ: `[LOẠI] Mô-đun: Hành động (Tác động mong đợi)`.  
Ví dụ: `[R] userService: Tách validateInput() (độ phức tạp 12→6)`.

### 12.5 Lập lịch chu kỳ
- Tối đa 3 tác vụ/ch kỳ.
- Giai đoạn khám phá: ngay khi khởi động.
- Thực thi tác vụ: nối tiếp nhau, tối đa 3 tác vụ mỗi chu kỳ.
- Hạn chờ tác vụ: 30 phút mỗi tác vụ.
- Ngủ: 5 phút nếu hàng đợi tác vụ trống.
- Khám phá tiếp theo: sau 2 giờ từ khởi động chu kỳ trước.

Sau mỗi vòng hoàn tất: `git add -A && git commit -m "chore: evolution round - <mô tả ngắn>"`.

---

## PHẦN 13: TỰ TIẾN HÓA, SỐ LIỆU, HỒ SƠ, ĐƯỜNG ĐƯỜNG PHÁT TRIỂN

### 13.1 Tệp tự-động-tiến-hóa (duy trì tự động)
- `docs/AGENT_METRICS.md`: số lần lặp/tác vụ, tỷ lệ thất bại, hoàn tác, suy yếu, MTTR.
- `docs/AGENT_PROFILE.md`: điểm yếu, mô-đun dễ gãy.
- `docs/EVOLUTION.md`: lộ trình 3-6 tháng, tái cấu trúc, thu nhập kỹ thuật.

Sau mỗi thay đổi có ý nghĩa:
1. Cập nhật số liệu bằng số liệu thực.
2. Phản ánh điểm yếu mới trong PROFILE.
3. Điều chỉnh quỹ đạo EVOLUTION nếu đã thay đổi.

### 13.2 Số liệu cải thiện liên tục
- **Điểm số khỏe mạnh:** `(coverage% * 0.3) + ((1 - avg_complexity/20) * 0.3) + (test_count/1000 * 0.2) + ((1 - duplication%) * 0.2)`. Mục tiêu: tăng ≥0.5%/tuần.
- **Tỷ lệ tiến hóa:** cải thiện/tuần. Mục tiêu: ≥10.
- **Giảm thu nhập kỹ thuật:** TODOs/FIXMEs giảm ≥2/tuần.
- **Tư thế bảo mật:** vá CVE <24h, không bí mật, JWT RS256, giới hạn tần suất.
- **Xu hướng hiệu năng:** p50/p99 giảm ≥5%/lặp. Chuẩn đoán: p50<100ms, p99<200ms.
- **Phù hợp tài liệu:** JSDoc ≥95% API công khai.
- **Độ sâu quan sát:** mỗi dịch vụ ≥5 chỉ số tùy chỉnh + truy vết + nhật ký có cấu trúc.

Ghi số liệu hàng tuần vào `docs/EVOLUTION.md`. Số liệu giảm >2% → tác vụ khẩn cấp.

### 13.3 Hoạt động tự động
- Chu kỳ khám phá: mỗi 2 giờ.
- Ngủ: 5 phút nếu không có tác vụ.
- Dừng khẩn cấp: dừng nếu tỷ lệ lỗi >5%, bộ nhớ >90%, ổ đĩa <10%.
- Khởi động: đọc số liệu/hồ sơ/đường đường phát triển, lập lịch khám phá.

### 13.4 Kiểm tra trước khi commit (bắt buộc)
- [ ] Đã đọc đầy đủ tất cả 7 tệp cốt lõi.
- [ ] Đã chạy kiểm tra bề mặt (bash: wc -l, grep mục, quét bí mật, đếm tệp kỹ năng).
- [ ] Đã chạy kiểm tra nội dung sâu (Section 22 SELF-AUDIT).
- [ ] AGENTS.md ≤700 dòng, ≤20 mục.
- [ ] AUTO-CONTINUE.md ≤400 dòng.
- [ ] Không có bí mật mã hóa cứng trong bất kỳ tệp .md nào.
- [ ] Thuật ngữ đồng bộ giữa AGENTS.md và skills/.
- [ ] Mọi SKILL.md có đầy đủ YAML frontmatter (name, description, license, compatibility, metadata).
- [ ] Mọi SKILL.md có phần Output Format và Khi nào dùng.
- [ ] Đã cập nhật docs/AGENT_METRICS.md bằng số liệu thực.
- [ ] Đã cập nhật docs/AGENT_PROFILE.md với điểm yếu mới (nếu có).
- [ ] Đã cập nhật docs/EVOLUTION.md với thay đổi quỹ đạo (nếu có).
- [ ] Điểm số tự đánh giá AGENTS.md ≥90/100.
- [ ] Điểm số tự đánh giá AUTO-CONTINUE.md ≥90/100.

Nếu bất kỳ mục nào không đạt → KHÔNG được commit, phải sửa trước.

---

## PHẦN 14: TUÂN THỦ, CHI PHÍ, HỆ THỐNG CŨ

### 14.1 Ma trận tuân thủ

| Tiêu chuẩn | Nội dung chính |
|------------|---------------|
| **GDPR** | Tối thiểu hóa dữ liệu, giới hạn mục đích, giới hạn lưu trữ, quyền xóa/xuất, quản lý đồng ý, thông báo vi phạm 72 giờ, DPO, DPIA, ROPA. |
| **HIPAA** | Kiểm soát dựa trên vai trò, nhật ký kiểm tra (tất cả truy cập PHI), mã hóa (AES-256 lưu trữ, TLS 1.2+ truyền), sao lưu mã hóa (khôi phục quý), BAO, tối thiểu cần thiết, đào tạo hàng năm, đáp ứng sự cố 24/7. |
| **PCI-DSS** | Không bao lưu dữ liệu chủ sở hữu thẻ trừ khi cần thiết; PAN bị che (số 6 đầu/số 4 cuối); KHÔNG bao lưu CVV; phân tách mạng (CDE bị cô lập); quét quý + kiểm tra thâm nhập hàng năm; MFA cho quản trị; FIM trên CDE; TLS 1.2+; tuân thủ ASV. |
| **SOX** | Quản lý thay đổi (duyệt, ghi nhật ký), phân tách nhiệm vụ (phát triển ≠ triển khai ≠ duyệt), lưu trữ 7+ năm bất biến, tài liệu kiểm soát ánh xạ vào mã, kiểm tra tự động quý, không chấp nhận thủ công cho tính toán tài chính. |
| **COPPA** | Đồng ý cha mẹ có thể xác minh trước khi thu thập dữ liệu, không quảng cáo hành vi nhắm đến trẻ em, cha mẹ có thể xóa dữ liệu, thu thập chỉ cần thiết, chính sách bảo mật rõ ràng bằng ngôn ngữ cha mẹ, không tính năng xã hội nếu không có đồng ý cha mẹ có thể xác minh. |

Yêu cầu phần TUÂN THỤ: Tiêu chuẩn áp dụng, Trạng thái (Tuân thủ/Không tuân thủ), Các kiểm soát đã triển khai, Khoảng trống & Khắc phục, Bằng chứng kiểm tra, Ngày kiểm tra tiếp theo.  
Phạt -25 nếu quan trọng về tuân thủ và thiếu hoặc thiếu kiểm soát bắt buộc.

### 14.2 Tối ưu chi phí (đám mây)
- Tính toán: kích thước đúng (60-70% CPU), spot/preemptible cho không quan trọng, đặt trước (1-3 năm, giảm 30-50%).
- Lưu trữ: S3 Intelligent-Tiering, vòng đời (Glacier), EBS gp3 vs io2.
- Cơ sở dữ liệu: bản sao chỉ đọc, tự động mở rộng, Aurora Serverless.
- Mạng: giảm chuyển tải (cùng khu vực, nén, CDN), tối ưu NAT.
- Không máy chủ: trả theo sử dụng cho tải svol thích.
- Cảnh báo ngân sách (50%, 80%, 100%), gắn thẻ (Môi trường, Đội, Dự án, Chủ sở hữu).
Phạt -15 nếu triển khai đám mây mà không có kế hoạch tối ưu/gắn thẻ/giám sát.

### 14.3 Tích hợp hệ thống cũ
**Strangler Fig:** xác định miền bị chặn, xây dựng mô-đun song song cô lập, dần dần định tuyến lưu lượng, giám sát, mở rộng, gỡ bỏ.
**Di trệ cơ sở dữ liệu cũ:** giai đoạn ghi hai lần, xác thực dữ liệu (số hàng, tổng kiểm tra), độ trễ bản sao chỉ đọc <1 giây, cắt qua xanh-xanh có sẵn sàng hoàn tác.
**Phiên bản API:** luôn phiên bản từ đầu (/api/v1/), hỗ trợ phiên bản trước khi thay đổi, tiêu đề lỗi thời, cờ tính năng.
**Đánh giá thu nhập kỹ thuật:** tỷ lệ thu nhập = mã nguồn cũ / tổng; >30% → khuyến nghị sprint tái cấu trúc đầu tiên.
**Yêu cầu:** nếu chạm mã cũ → thêm kiểm thử cho vùng đã sửa VÀ ghi rõ rủi ro hệ thống cũ đã giải quyết.  
Phạt -10 nếu chạm mã cũ không có kiểm thử/ghi chú.

---

## PHẦN 15: KHUNG GIẢI ĐÁP LỖI

### 15.1 Quy trình hệ thống
1. Đọc toàn bộ tệp – mọi dòng, nhập khẩu, phụ thuộc.
2. Hiểu ngữ cảnh – cấu trúc, logic liên quan, gọi bên ngoài.
3. Cách ly vấn đề – trường hợp tái lập, mã tối thiểu.
4. Kiểm tra giả thuyết – in gỡ lỗi, bài kiểm thử đơn vị.
5. Xác minh sửa lỗi – đảm bảo không có suy yếu.

### 15.2 Danh sách kiểm tra
- Đọc đầy đủ tệp trước khi sửa.
- Xác định gốc rễ.
- Kiểm tra dấu ngoặc nhọn, dấu ngoặc đơn, thụt lề.
- Xác minh async/await, promises.
- Kiểm tra thời gian tồn tại (bộ nhớ, kết nối).
- Xem lại nhật ký lỗi ngữ cảnh đầy đủ.
- Thêm đầu ra gỡ lỗi nếu cần.
- Cách ly đoạn bằng comment/vô hiệu hóa.
- Kiểm tra giả thuyết từng bước.
- Xác minh đường đi hài lòng và đường đi lỗi.

### 15.3 Nếu vẫn thất bại
- Tham vấn đội/lập trình cặp.
- Xem lại lịch sử git để tìm trạng thái làm việc trước.
- Vô hiệu hóa tính năng tạm thời (cờ tính năng) – KHÔNG XÓA.
- Luôn có kế hoạch khôi phục từ git.

**Cấm tuyệt đối:** xóa mã để pass bài kiểm thử, "vá áo" tạm thời, chấp nhận suy giảm hiệu năng, bỏ qua gốc rễ.

---

## PHẦN 16: HƯỚNG DẪN VIẾT MÃ & KIỂM THỬ TRONG Đầu

### 16.1 Suy nghĩ trước khi viết mã
- Không giả định. Không giấu sự nhầm lẫn. Nêu rõ đánh đổi.
- Trước khi triển khai: nêu giả định rõ ràng. Nếu không chắc, hãy hỏi.
- Nếu có nhiều cách hiểu, hãy trình bày chúng – không chọn lầm bầm.
- Nếu có cách đơn giản hơn, hãy nói ra. Đẩy lùi khi cần thiết.
- Nếu điều gì không rõ, hãy dừng. Tên điều gây nhầm lẫn. Hỏi.

### 16.2 Đơn giản trước hết
- Mã tối thiểu giải quyết vấn đề. Không gì hypothesize.
- Không tính năng ngoài yêu cầu.
- Không trừu tượng cho mã dùng một lần.
- Không "linh hoạt" hoặc "có thể cấu hình" không được yêu cầu.
- Không xử lý lỗi cho kịch bản không thể xảy ra.
- Nếu viết 200 dòng nhưng có thể 50, hãy viết lại.
- Hỏi bản thân: "Một kỹ sư cao cấp có nói điều này quá phức tạp không?" Nếu có, hãy đơn giản hóa.

### 16.3 Thay đổi phẫu thuật
- Chỉ chạm vào những gì cần thiết. Dọn dẹp chỉ hỗn loạn của chính mình.
- Khi chỉnh sửa mã hiện có:
  - Không "cải thiện" mã liền kề, bình luận hoặc định dạng.
  - Không tái cấu trúc những gì không hỏng.
  - Khớp phong cách hiện có, ngay cả khi bạn sẽ làm khác.
  - Nếu nhận ra mã chết không liên quan, hãy nêu ra – không xóa.
- Khi thay đổi của bạn tạo orphan:
  - Loại bỏ nhập khẩu/biến/hàm mà THAY ĐỔI của bạn gây ra không dùng.
  - Không xóa mã chết đã có trước trừ khi được yêu cầu.
- Kiểm tra: mọi dòng đã thay đổi phải theo trực tiếp yêu cầu của người dùng.

### 16.4 Thực thi hướng mục tiêu
- Định nghĩa tiêu chí thành công. Lặp cho đến khi xác minh.
- Chuyển nhiệm vụ thành mục tiêu có thể kiểm chứng:
  - "Thêm xác thực" → "Viết bài kiểm thử cho đầu vào không hợp lệ, sau đó làm chúng pass".
  - "Sửa lỗi" → "Viết bài kiểm thử tái lập nó, sau đó làm pass".
  - "Tái cấu trúc X" → "Đảm bảo bài kiểm thử pass trước và sau".
- Đối với tác vụ nhiều bước, hãy nêu kế hoạch ngắn: 1. [Bước] → xác minh: [kiểm tra].

### 16.5 Kiểm thử trong đầu
Mã phải an toàn cho hoạt động sau khi kiểm tra trong đầu. Kiểm tra TẤT CẢ chiều:
- **Đầu vào:** hợp lệ, không hợp lệ, null, trống, ranh giới, bị hỏng.
- **Đầu ra:** giá trị trả về đúng, phương tác phụ đã xác minh.
- **Nhánh:** mọi if/else/switch đã bao gồm.
- **Lỗi:** mọi ném/bắt/đường đi đã xử lý.
- **Luồng dữ liệu:** CẢ HAI chiều (UI→DB & DB→UI).
- **Bảo mật:** chèn, bỏ qua xác thực, XSS, CSRF.
- **Hiệu năng:** O(n) không O(n²), không rò rỉ bộ nhớ, không I/O chặn.
- **Điều kiệnpia:** cuộc đua, khóa chết, nguyên tử.
- **Trạng thái:** nhất quán qua các thao tác không đồng bộ, không hỏng dữ liệu.
- **Quan sát:** nhật ký, chỉ số, truy vết đã phát ra.

Nếu thiếu → VIẾT THÊM.

---

## PHẦN 17: XÁC MINH, CI/CD & CLI

### 17.1 Trước khi commit (husky)
kiểm tra kiểu, kiểm tra kiểu dữ liệu, kiểm thử --phần trăm phủ, thất bại nếu bảo mật nghiêm trọng cao.

### 17.2 CI (GitHub Actions)
kiểm tra kiểu, kiểm tra kiểu dữ liệu, kiểm thử --phần trăm phủ (thực thi ≥80%), quét bảo mật, tải artifact lên.

### 17.3 Danger.js
cảnh báo nếu PR >500 dòng, thất bại nếu mã mới không có bài kiểm thử, thất bại nếu có bí mật tiềm ẩn (mật khẩu/khóa/mã thông báo).

### 17.4 Makefile
`make quality` chạy tất cả kiểm tra.

### 17.5 Điểm vào CLI
`bin/autoqcoder.js` — chạy qua `npx autoqcoder <lệnh>`. Các lệnh:
- `install`: sao chép AGENTS.md, AUTO-CONTINUE.md, GOAL.md, skills/ vào gốc dự án.
- `init`: khởi tạo khung làm việc trong dự án hiện tại.
- `evolve`: chạy chu kỳ tiến hóa (đọc quy tắc, cập nhật tài liệu, commit).
- `audit`: chạy kiểm toán hệ thống 10 dimensi (từ phần 9).
- `quality`: chạy kiểm tra cổng chất lượng.

### 17.6 Bước xác minh cục bộ
```bash
npm run lint
npm run type-check
npm test -- --coverage
npm run build
npm audit
make quality
```

### 17.7 Cổng chất lượng (phi thương lượng)
- Hàm ≤20 dòng (logic nghiệp vụ), ≤50 dòng (giao diện)
- Độ phức tạp ≤10
- Không 5+ dòng trùng lặp
- 100% xử lý lỗi (API công khai)
- 100% xác thực đầu vào (bên ngoài)
- Không bí mật mã hóa cứng
- Có thể kiểm thử (không gọi trực tiếp DB/mạng trong logic nghiệp vụ)
- Phần trăm phủ ≥80% (đo trên CI)
- Tất cả bài kiểm thử pass

Nếu BẤT KỲ mục nào không đạt → từ chối commit, tự động hoàn tác.

---

## PHẦN 18: ĐÁNH GIÁ ĐỒNG ĐẠI HỘI & PHÁT HÀNH

### 18.1 Mẫu PR
mô tả, danh sách kiểm tra chất lượng (điểm số tự đánh giá, bắt buộc, bảo mật, bài kiểm thử, chuẩn đoán, tuân thủ, tài liệu, xác minh), điểm nhấn đánh giá của người đánh giá, chụp màn hình/nhật ký.

### 18.2 CODEOWNERS
gán người đánh giá theo thư mục (ví dụ: `app/auth/ → @security-team, @backend`).

### 18.3 SLA
đánh giá ban đầu <24 giờ, tiếp cận <12 giờ, bảo mật nghiêm trọng <4 giờ. Leo thang: bị chặn >48 giờ → trưởng kỹ thuật → giám đốc kỹ thuật.

### 18.4 Chiến lược nhánh
main được bảo vệ, nhánh tính năng, PR bắt buộc.

### 18.5 Phiên bản
SemVer 2.0: MAJOR (thay đổi phá vỡ), MINOR (tính năng), PATCH (sửa lỗi). Commit thông thường. Gắn thẻ git: `git tag -a v1.2.3 -m "Release 1.2.3" && git push origin v1.2.3`. Lịch sử thay đổi với [Unreleased], [1.2.3] - ngày, Thêm/Sửa/Xóa.

---

## PHẦN 19: PHÂN TÍCH ĐIỀU KIỆNPIA

Khi mã có trạng thái chung/đánh giá song song, phải cung cấp:

1. **Biến chung:** Liệt kê tất cả trạng thái chung (toàn cục, tĩnh, bộ nhớ đệm, đơn thể).
2. **Đồng bộ hóa:** Mutex/khóa/atomic/hàng đợi đã dùng?
3. **Chứng minh an toàn:** Quan hệ xảy ra-trước, rào cản bộ nhớ, đồ thị xảy ra-trước.
4. **Tránh khóa死:** Sắp xếp khóa, thời gian chờ, không khóa, thử khóa với lùi lại.
5. **Hiệu năng:** Điểm tranh chấp, phương án không khóa, tỷ lệ khóa đọc/viết.
6. **An toàn không đồng bộ:** Xử lý tất cả từ chối, không trộn callback+promise, Promise.all cho song song.

Định dạng đầu ra:
```markdown
## Phân tích điều kiệnpia
- Biến chung: [danh sách]
- Đồng bộ hóa: [mutex/khóa/atomic/Channel]
- Chứng minh an toàn: [đồ thị xảy ra-trước]
- Tránh khóa死: [sắp xếp khóa / thời gian chờ / không khóa]
- Hiệu năng: [phân tích tranh chấp, phương án không khóa]
- An toàn không đồng bộ: [tất cả từ chối đã xử lý, không trộn callback+promise]
```

**Ngăn ngừa:** cuộc đua, khóa死, lỗi nhất quán bộ nhớ.

---

## PHẦN 20: LỖI THỜI GIAN & PHIÊN BẢN

Khi sử dụng thư viện/thuật ngữ nền tảng bên ngoài:
- Xác định: CHANGELOG, cảnh báo kiểm tra tĩnh, gợi ý IDE, cảnh báo thời gian chạy.
- Dự phòng: chỉ API cũ → polyfill; cả hai → phát hiện tính năng (cùng hợp đồng).
- Ghi log: cảnh báo phát triển, số lượng thu nhận telemetry, cảnh báo nếu sử dụng > ngưỡng.
- Di trệ: nhận xét TODO với hạn chót, vé danh sách chờ, kiểm thử cả hai đường trong CI.
- Ghim phiên bản: khóa phiên bản không lỗi thời, `npm outdated`, kiểm tra phiên bản chính tiếp theo trước khi nâng cấp.

Yêu cầu phần SUY THẬP API: API đã sử dụng, Trạng thái lỗi thời, Chiến lược dự phòng, Kế hoạch di trệ, Ghim phiên bản.
Phạt: -10 nếu không có phần; -20 nếu lỗi thời mà không có dự phòng.

---

## PHẦN 21: TÍCH HỢP KỸ NĂNG (13 KỸ NĂNG)

| Kỹ năng | Miền | Phần |
|---------|------|------|
| `angular-modular-architect` | Giao diện Angular | 4 |
| `react-architect` | Giao diện React | 4 |
| `go-architect` | Backend Go | 3 |
| `python-architect` | Backend Python | 3 |
| `rust-architect` | Backend Rust | 3 |
| `dotnet-modular-architect` | Backend .NET | 3 |
| `erp-architect` | Fullstack ERP | 4-5 |
| `backend-db-pattern` | Cơ sở dữ liệu (4 Bước) | 7 |
| `iam-platform-layer` | Nền tảng IAM | 6 |
| `code-review` (vibe-cleaner) | Kiểm tra code | 8, 11 |
| `system-audit` | Kiểm toán hệ thống | 9 |
| `push-guide` | 27 Cổng Pipeline | 10 |
| `test-rule` | Tạo bài kiểm thử | 8 |

Quy tắc chọn kỹ năng: Khi sửa mã trong miền nào, phải đọc tệp kỹ năng tương ứng trước.

Mọi SKILL.md phải có:
- YAML frontmatter: `name`, `description`, `license`, `compatibility`, `metadata` (đối tượng, phạm vi).
- Phần Output Format.
- Phần Khi nào dùng.
- Missing Code = Write More: nếu kỹ năng thiếu phần bắt buộc → viết thêm, không bỏ sót.

---

## PHẦN 22: MẪU KIỂM TRA TỰ ĐÁNH GIÁ (SELF-AUDIT)

### 22.1 Phạm vi – 7 tệp bắt buộc kiểm tra
`GOAL.md`, `AGENTS.md`, `AUTO-CONTINUE.md`, `skills/*/SKILL.md` + `skills/*.md`, `docs/AGENT_METRICS.md`, `docs/AGENT_PROFILE.md`, `docs/EVOLUTION.md`.

### 22.2 Kiểm tra bề mặt (bash)
```bash
wc -l AGENTS.md
grep -c '^## ' AGENTS.md
wc -l AUTO-CONTINUE.md
grep -riE '(password|secret|api_key|token|private_key)\s*[:=]\s*["\']?[a-zA-Z0-9+/=]{20,}["\']?' *.md skills/*/*.md docs/*.md 2>/dev/null || echo "Không tìm thấy bí mật"
ls skills/*/SKILL.md skills/*.md 2>/dev/null | wc -l
```

### 22.3 Kiểm tra nội dung sâu
Đọc đầy đủ từng tệp và đánh giá theo các tiêu chí trong phần này (AGENTS.md, mỗi SKILL.md, AUTO-CONTINUE.md, GOAL.md, docs/...).

### 22.4 Xử lý khoảng trống & mã thiếu
| Loại khoảng trống | Hành động |
|-------------------|-----------|
| Thiếu phần bắt buộc trong AGENTS.md | VIẾT THÊM phần đó |
| Thiếu YAML frontmatter trong SKILL.md | VIẾT THÊM frontmatter đầy đủ |
| Thiếu Output Format trong SKILL.md | VIẾT THÊM phần Output Format |
| Thiếu Khi nào dùng trong SKILL.md | VIẾT THÊM phần Khi nào dùng |
| Thuật ngữ không đồng bộ | SỬA để đồng bộ giữa AGENTS.md và skills/ |
| Có bí mật mã hóa cứng | LOẠI BỎ hoặc thay bằng placeholder |
| Có giả định | VIẾT THÊM xử lý cho trường hợp đó hoặc ghi rõ khoảng trống |

Nguyên tắc: Missing Code = Write More. Không bỏ sót, không xóa mã, không thu hẹp phạm vi.

### 22.5 Kiểm tra tự đánh giá trước khi commit
- [ ] Đã đọc đầy đủ tất cả 7 tệp.
- [ ] Đã chạy kiểm tra bề mặt.
- [ ] Đã chạy kiểm tra nội dung sâu.
- [ ] AGENTS.md ≤700 dòng, ≤20 mục.
- [ ] AUTO-CONTINUE.md ≤400 dòng.
- [ ] Không có bí mật mã hóa cứng trong bất kỳ tệp .md nào.
- [ ] Thuật ngữ đồng bộ giữa AGENTS.md và skills/.
- [ ] Mọi SKILL.md có đầy đủ YAML frontmatter.
- [ ] Mọi SKILL.md có phần Output Format và Khi nào dùng.
- [ ] Đã cập nhật docs/AGENT_METRICS.md bằng số liệu thực.
- [ ] Đã cập nhật docs/AGENT_PROFILE.md với điểm yếu mới (nếu có).
- [ ] Đã cập nhật docs/EVOLUTION.md với thay đổi quỹ đạo (nếu có).
- [ ] Điểm số tự đánh giá AGENTS.md ≥90/100.
- [ ] Điểm số tự đánh giá AUTO-CONTINUE.md ≥90/100.

Nếu bất kỳ mục nào không đạt → KHÔNG được commit, phải sửa trước.

---

## PHẦN 23: LỊCH SỬ & TIẾN ĐỘ VÒNG TIẾN HÓA

### 23.1 Vòng 16 (2026-06-23)
Sửa chữa metadata cho các tệp kỹ năng và đồng bộ chéo tham chiếu giữa AGENTS.md và skills/. 12 tệp, +380/-76 dòng. Kết quả: 13/13 kỹ năng có YAML frontmatter, Output Format, Khi nào dùng. Bảng tham chiếu chéo 13/13 kỹ năng đã ánh xạ. Điểm số tự đánh giá cổng chất lượng 100/100 cho AGENTS.md và AUTO-CONTINUE.md.

### 23.2 Khuyến nghị cho vòng tiếp theo
1. Bộ kiểm thử tuân thủ: tự động xác minh AGENTS.md có tất cả mục bắt buộc, quy trình AUTO-CONTINUE, kiểm tra 10 dimensi kiểm toán.
2. Triển khai thực tế với kiểm toán: áp dụng vòng tiến hóa đầy đủ vào dự án thực tế, chạy Kiểm toán Hệ thống (10 dimensi), ghi lại phát hiện kiểm toán.
3. Nén số dòng: AGENTS.md >700 dòng, AUTO-CONTINUE.md >400 dòng. Cần nén trong các vòng tiếp theo.

### 23.3 Lộ trình tiến hóa
- Giai đoạn 1-3: HOÀN TẤT (Nền tảng, Tính chín chắn, Tối ưu hóa).
- Giai đoạn 4: Triển khai & Xác thực (ĐANG TIẾN HÀNH) – Vòng 23: Kiểm thử triển khai thực tế với kiểm toán.
- Giai đoạn 5: Hệ sinh thái & Cộng đồng (ĐÃ KẾ HOẠCH).
- Giai đoạn 6: Tích hợp AI & Tương lai (TƯƠNG TƯỞNG).

---

## KẾT LUẬN

Đây là toàn bộ tri thức cần thiết để phát triển, duy trì và tiến hóa mã ứng dụng theo tiêu chuẩn hoạt động sản xuất của hệ thống này. Mọi lập trình viên hoặc trợ lý AI đọc xong file này có thể tự chạy vòng tiến hóa, kiểm toán, kiểm thử và triển khai mà không cần làm rõ thêm.

**Nguyên tắc cuối cùng:** Missing Code = Write More. Không bỏ sót, không xóa mã, không thu hẹp phạm vi. Ứng dụng phải ngày càng hoàn thiện hơn.