# BOOKFLOW AI — QUY TRÌNH TẠO FOLDER VÀ VIẾT TỪNG FILE

**Bản:** 2.0 · **Loại tài liệu:** thứ tự thực hiện **source code theo thư mục/file** · **Căn cứ:** `cau-truc-bookflow-ai-chuan-ky-thuat-va-nghiep-vu.md` (bản 1.1).  
**Đích:** tạo và hoàn thiện BookFlow từ thư mục rỗng đến lúc chạy được từng chức năng, từng ứng dụng và toàn hệ thống. Đây **không** phải kế hoạch kinh doanh, bảng tiến độ nhân sự hay hướng dẫn Git branch.  
**Stack đã chốt:** Handlebars + Bootstrap + JavaScript; Node.js + Express; Python + FastAPI; PostgreSQL + pgvector; Redis; MinIO; Nginx; Docker Compose.

## 0. Quy tắc đọc tài liệu

1. Mỗi bước ghi **tạo folder nào → viết file nào → file phụ thuộc → cách kiểm tra → điều kiện sang bước tiếp theo**. Thực hiện lần lượt theo mã `F00` đến `F18`; trong mỗi bước đi từ trên xuống dưới.
2. **Tên lớp kỹ thuật bằng tiếng Anh** (`frontend/`, `backend/`, `database/`, `services/`, `routes/`, `Dockerfile`...). **Tên nghiệp vụ do dự án tự đặt bằng tiếng Việt không dấu** (`sach/`, `khach-hang/`, `danh-sach-sach.hbs`, `sach.service.js`). Python dùng `snake_case` (`tu_van_sach.py`), PostgreSQL dùng `snake_case` (`dau_sach`).
3. **Không tạo hàng trăm file rỗng ở ngày đầu.** Chỉ tạo folder cha và file đang cần ở bước hiện tại. Thư mục trong cây đích chưa được dùng có thể tạo về sau; nếu cần theo dõi thư mục trống trên Git thì dùng `.gitkeep` tạm thời.
4. Chỉ có **một nguồn nghiệp vụ** trong `backend`; frontend render/gọi API, Python xử lý AI. Chỉ có **một module upload** ở backend. Mỗi form nghiệp vụ tái sử dụng trường nhập liệu và JS lõi, không nhân bản cả form qua nhiều trang.
5. Viết **test cùng lúc với file**, không để đến cuối dự án. Mỗi bước chỉ được đánh dấu hoàn thành khi khởi động hoặc test được phần vừa tạo.
6. `database/migrations/` là chuỗi có lịch sử. Tên `001_...` tới `014_...` trong cây cấu trúc là **dự kiến**; quan hệ FK thực tế có thể yêu cầu tách nhỏ hoặc chuyển FK sang migration sau. Không sửa migration đã chạy production.
7. `frontend`, `backend`, `ai-api`, `ai-worker` là **bốn image có thể build riêng**. `backend-worker` dùng lại image `backend` với command khác. PostgreSQL/Redis/MinIO/Nginx là hạ tầng; migration là job riêng.

---

# PHẦN I — CÂY THỨ TỰ THỰC HIỆN FOLDER / FILE

```text
BookFlow/                                      [F00] Khung repository và quy ước
│
├── contracts/                                 [F01] Định dạng request/response trước khi nối app
│   ├── openapi/
│   ├── schemas/
│   └── examples/
│
├── infrastructure/                            [F02] PostgreSQL, Redis, MinIO cục bộ
├── compose.yaml                               [F02] Compose tối thiểu; Nginx thêm sau
├── compose.dev.yaml                           [F02] Cấu hình phát triển
│
├── database/                                  [F03] Runner migration → extension → bảng nền
│   ├── scripts/
│   ├── migrations/
│   └── seeds/
│
├── backend/                                   [F04] Express/API/health/DB/common
│   ├── src/config/
│   ├── src/common/
│   ├── src/database/
│   └── src/routes/
│
├── backend/src/modules/                       [F05] Auth → đơn vị → chi nhánh → phân quyền
│
├── frontend/                                  [F06] Express render → layout → trang công khai
│   ├── src/config/
│   ├── src/views/
│   └── src/public/
│
├── frontend/src/assets/                       [F07] Tự vẽ SVG/logo → build sprite → icon partial
├── frontend/src/views/partials/               [F08] Form field, bảng, modal, JS/CSS dùng chung
│
├── backend/src/modules/tep-dinh-kem/          [F09] MinIO → metadata → upload có quyền
├── backend/src/modules/sach/                  [F10] Danh mục sách + phiên bản + hình ảnh
├── backend/src/modules/nha-cung-cap/          [F11] Nhà cung cấp, nhập kho
├── backend/src/modules/kho/                   [F11] Tồn bán, bản sao, biến động/điều chuyển
├── backend/src/modules/khach-hang/            [F12] Khách hàng
├── backend/src/modules/hoi-vien/              [F12] Gói, đăng ký, quyền lợi
├── backend/src/modules/thanh-toan/            [F13] Khoản phải thu, thanh toán, cọc, hoàn
├── backend/src/modules/gio-hang/              [F14] Giỏ hàng
├── backend/src/modules/ban-hang/              [F14] POS, đơn bán, giao/đổi trả
├── backend/src/modules/muon-tra/              [F15] Đặt trước, cho mượn/thuê, trả, gia hạn
│
├── backend/src/jobs/                          [F16] BullMQ; email, nhắc hạn, thông báo
├── ai-service/                                [F17] FastAPI → AI service → RQ worker
├── backend/src/modules/ai/                    [F17] Tích hợp AI nội bộ
│
├── backend/src/modules/bao-cao/               [F18] Báo cáo
├── backend/src/modules/saas/                  [F18] Quản trị gói phần mềm
├── infrastructure/nginx/                      [F18] Proxy/HTTPS, chỉ public Nginx
├── scripts/                                   [F18] Build/deploy/backup
├── .github/workflows/                         [F18] CI/test/build và phát hành
└── docs/                                      [F00–F18] Viết tài liệu đúng lúc tạo file
```

**Nhánh kiểm thử dọc:** sau khi có một API đầu tiên, hoàn thiện luồng `migration → repository → service → controller → route → API client → trang/form → test`. Sau đó áp dụng cùng quy trình cho từng module. **Không** làm xong mọi bảng, rồi mới làm mọi backend, rồi mới làm mọi frontend.

---

# PHẦN II — QUY TRÌNH CHI TIẾT THEO FOLDER VÀ TỪNG FILE

## F00. Tạo thư mục gốc và quy ước dự án

**Tạo trước:**

```text
BookFlow/
├── frontend/
├── backend/
├── ai-service/
├── database/
├── contracts/
├── infrastructure/
├── scripts/
├── docs/
├── .github/workflows/
├── package.json
├── .env.example
├── .gitignore
├── .dockerignore
└── README.md
```

**Viết theo thứ tự:**

| Thứ tự | File | Nội dung phải có / vì sao viết lúc này |
|---:|---|---|
| 1 | `README.md` | Mục tiêu BookFlow, sơ đồ app, lệnh chạy dự kiến, đường dẫn tài liệu và quy tắc không commit bí mật. |
| 2 | `.gitignore` | Loại `.env*` thật, `node_modules/`, `.venv/`, `__pycache__/`, cache/build, file upload, dump và log; **không** loại `.env.example`. |
| 3 | `.dockerignore` | Tránh gửi Git, bí mật, cache, dependency máy local vào build context; mỗi app sẽ có `.dockerignore` riêng. |
| 4 | `.env.example` | Tên biến dùng chung: môi trường, tên image/tag, cổng proxy, cấu hình Compose; chỉ giá trị mẫu, không chứa mật khẩu thật. |
| 5 | `package.json` | `private: true`; script gọi `scripts/` cho build chung/riêng, test, dev, migrate; ban đầu chỉ khai báo những lệnh đã có script. |
| 6 | `docs/architecture/tong-quan.md` | Chốt luồng browser → Nginx → frontend/backend → Python/DB/Redis/MinIO và ranh giới nghiệp vụ. |
| 7 | `docs/architecture/ranh-gioi-phan-he.md` | Tác vụ nào do frontend, backend, AI API, AI Worker thực hiện; quyền sửa dữ liệu thuộc backend. |
| 8 | `docs/database/tu-dien-du-lieu.md` | Đưa bộ từ điển dữ liệu đã duyệt vào nguồn tài liệu, giữ bản gốc để đối chiếu. |

**Kiểm tra:** `package.json` là JSON hợp lệ, tên folder gốc khớp bản cấu trúc 1.1, không có mật khẩu/khóa thật, chưa có file nghiệp vụ giả lập. **Xong F00 khi:** repository được khởi tạo và người khác đọc README biết mở phần nào trước.

## F01. Tạo `contracts/` trước khi FE và BE trao đổi dữ liệu

```text
contracts/
├── openapi/
│   ├── bookflow-api.yaml
│   └── ai-noi-bo-api.yaml
├── schemas/
│   ├── sach.schema.json
│   ├── khach-hang.schema.json
│   ├── tac-vu-ai.schema.json
│   └── loi-api.schema.json
├── examples/
│   ├── sach.response.json
│   ├── tao-don-hang.request.json
│   └── tim-kiem-ai.response.json
└── README.md
```

| Thứ tự | File | Việc phải thực hiện |
|---:|---|---|
| 1 | `contracts/README.md` | Quy định version API, format lỗi, pagination, thời gian UTC, tiền `NUMERIC` biểu diễn an toàn trong JSON, cách thay đổi hợp đồng. |
| 2 | `contracts/schemas/loi-api.schema.json` | Format lỗi thống nhất: `ma_loi`, thông điệp, lỗi từng trường, mã request; không trả stack trace. |
| 3 | `contracts/openapi/bookflow-api.yaml` | Định nghĩa `/health`, đăng nhập và API danh mục công khai trước; thêm endpoint mỗi khi làm module tương ứng. |
| 4 | `contracts/openapi/ai-noi-bo-api.yaml` | Hợp đồng nội bộ cho tư vấn sách và tạo tác vụ AI: xác thực service, `don_vi_id`, request ID, trạng thái job. Viết phần khung trước, bổ sung ở F17. |
| 5 | `contracts/schemas/sach.schema.json`, `khach-hang.schema.json`, `tac-vu-ai.schema.json` | Chỉ khai báo phiên bản hợp đồng thực sự được dùng ở giai đoạn tương ứng; không tự coi schema JSON là thay thế cho validation BE. |
| 6 | `contracts/examples/*.json` | Tạo request/response mẫu hợp lệ đối chiếu với OpenAPI và schema. |
| 7 | `docs/api/quy-uoc-api.md`, `docs/api/xac-thuc.md` | Giải thích chuẩn, không tạo bản OpenAPI thứ hai trong docs. |

**Kiểm tra:** các JSON parse được, ví dụ đúng schema, các endpoint được FE/BE dùng cùng tên; thay đổi hợp đồng không tương thích phải có test hoặc version. **Xong F01 khi:** có hợp đồng cho `/health`, danh mục sách và lỗi API.

## F02. Tạo hạ tầng tối thiểu để chạy local

```text
infrastructure/
├── postgres/init/
├── redis/redis.conf
├── minio/policies/
└── scripts/check-health.sh

BookFlow/
├── compose.yaml
└── compose.dev.yaml
```

| Thứ tự | File/folder | Viết gì |
|---:|---|---|
| 1 | `infrastructure/postgres/init/` | Chỉ cấu hình khởi tạo database/user/extension khi thực sự cần; SQL tạo bảng nghiệp vụ **không** đặt ở đây. |
| 2 | `infrastructure/redis/redis.conf` | Cấu hình local phù hợp, giới hạn truy cập mạng; queue Node và Python có prefix riêng. |
| 3 | `infrastructure/minio/policies/` | Chính sách bucket/private-public dự kiến; chưa mở bucket công khai vô điều kiện. |
| 4 | `compose.yaml` | Khai báo `postgres` có pgvector, `redis`, `minio`, network nội bộ, named volume, healthcheck. Chưa cần đưa mọi app vào khi chưa có app chạy được. |
| 5 | `compose.dev.yaml` | Chỉ override cấu hình phục vụ local: port bind `127.0.0.1` khi phù hợp, log, volume phát triển, file env mẫu. |
| 6 | `infrastructure/scripts/check-health.sh` | Kiểm tra tình trạng PostgreSQL, Redis và MinIO từ đúng network/container. |

**Chạy thử:** `docker compose -f compose.yaml -f compose.dev.yaml config`, sau đó chạy hạ tầng tối thiểu; kiểm tra kết nối và dữ liệu volume còn khi container được tạo lại. **Xong F02 khi:** DB, Redis, object storage sẵn sàng; không có dịch vụ dữ liệu mở cổng Internet ngoài ý muốn.

## F03. Tạo `database/`: runner trước, migration sau

```text
database/
├── package.json
├── package-lock.json
├── scripts/
│   ├── migrate.js
│   ├── check-migrations.js
│   └── seed.js
├── migrations/
│   ├── 001_tien_ich_va_extension.sql
│   ├── 002_nen_tang_saas.sql
│   ├── 003_tai_khoan_va_phan_quyen.sql
│   ├── 004_metadata_tep.sql
│   ├── 005_danh_muc_sach.sql
│   ├── 006_nha_cung_cap_va_kho.sql
│   ├── 007_khach_hang_va_hoi_vien.sql
│   ├── 008_ban_hang.sql
│   ├── 009_muon_tra.sql
│   ├── 010_tai_chinh_va_thanh_toan.sql
│   ├── 011_thong_bao.sql
│   ├── 012_du_lieu_ai.sql
│   ├── 013_thanh_toan_saas.sql
│   └── 014_rang_buoc_va_chi_muc.sql
├── seeds/
│   ├── quyen.sql
│   ├── vai_tro_mac_dinh.sql
│   ├── cau_hinh_he_thong.sql
│   └── du_lieu_demo.sql
├── tests/
├── Dockerfile.migrate
└── README.md
```

**Thứ tự viết file thực tế:**

1. `database/package.json` → cài dependency PostgreSQL/migration runner; sinh `package-lock.json` bằng package manager, không viết lockfile thủ công.
2. `database/scripts/migrate.js` → tạo bảng lịch sử migration, tính checksum, transaction theo từng migration nếu phù hợp, chặn chạy lại hoặc sửa file đã áp dụng. `check-migrations.js` → kiểm tra tên/số thứ tự/checksum và trạng thái DB. `seed.js` → chỉ chạy seed được cho phép theo môi trường.
3. `001_tien_ich_va_extension.sql` → UUID, pgvector và extension cần thiết. Test extension trước khi tạo vector column.
4. `002_nen_tang_saas.sql` → `don_vi`, `chi_nhanh` và bảng nền không phụ thuộc bảng về sau. **Không** tạo FK tới bảng chưa tồn tại.
5. `003_tai_khoan_va_phan_quyen.sql` → tài khoản, phiên đăng nhập, xác minh, thành viên, vai trò/quyền. Viết `seeds/quyen.sql` và `vai_tro_mac_dinh.sql` sau khi bảng tương ứng tồn tại.
6. `004_metadata_tep.sql` → `tep_dinh_kem` trước `dau_sach`, vì sách tham chiếu `anh_bia_chinh_id`.
7. `005_danh_muc_sach.sql` → đầu sách, phiên bản, tác giả, thể loại, từ khóa, `tep_sach`, hình thức cung cấp. Test FK theo tenant.
8. `006_nha_cung_cap_va_kho.sql` → nhà cung cấp, phiếu nhập, tồn bán, bản sao sách, biến động, chuyển/kiểm kê. Kiểm tra chống tồn âm và trùng mã bản sao.
9. `007_khach_hang_va_hoi_vien.sql` → khách hàng, gói hội viên, đăng ký, quyền lợi và lịch sử sử dụng.
10. `008_ban_hang.sql`, `009_muon_tra.sql` → bảng giỏ/đơn bán, phiếu mượn/trả/đặt trước; **chưa ép FK vòng** tới các bảng tài chính chưa được tạo.
11. `010_tai_chinh_va_thanh_toan.sql` → khoản phải thu, thanh toán, phân bổ, cọc, hoàn, chứng từ và đối soát; bổ sung ràng buộc chéo ở migration sau khi bảng đích có mặt.
12. `011_thong_bao.sql`, `012_du_lieu_ai.sql`, `013_thanh_toan_saas.sql` → chỉ viết trước khi đến tính năng tương ứng. Trong F03 trước mắt cần chạy đến `005` để làm danh mục sách.
13. `014_rang_buoc_va_chi_muc.sql` → FK hoãn, unique/composite FK, partial index, index theo `don_vi_id`, kiểm tra trạng thái dữ liệu. Tách tiếp thành nhiều migration nếu cần để không chờ tới cuối mới bảo vệ dữ liệu.
14. `seeds/cau_hinh_he_thong.sql` và `du_lieu_demo.sql` → demo chỉ chạy ở dev/stable, không tự seed demo trên production.
15. `database/tests/` → test migrate trên DB sạch, chạy lại không nhân dữ liệu, FK/unique/check, tenant-scope và transaction. Cuối cùng mới viết `Dockerfile.migrate` cho job migration chạy được độc lập.

**Kiểm tra mỗi migration:** tạo DB rỗng → chạy migration → xem bảng/index/FK → chạy lại runner → xác nhận không chạy lại → test rollback bằng khôi phục DB thử nghiệm hoặc migration bù được thiết kế. **Xong F03 nền khi:** có runner và migration `001–005` hoạt động; những migration `006–014` viết **đúng lúc** triển khai module tương ứng.

## F04. Tạo khung Backend API trước mọi module

```text
backend/
├── package.json
├── package-lock.json
├── .env.example
├── .dockerignore
├── src/
│   ├── config/environment.js
│   ├── config/cors.js
│   ├── config/session.js
│   ├── config/security.js
│   ├── common/errors/AppError.js
│   ├── common/errors/error-codes.js
│   ├── common/middlewares/xu-ly-loi.js
│   ├── common/middlewares/kiem-tra-du-lieu.js
│   ├── common/middlewares/gioi-han-tan-suat.js
│   ├── common/validators/dung-chung.schema.js
│   ├── common/validators/phan-trang.schema.js
│   ├── common/validators/ngay.schema.js
│   ├── common/validators/tien.schema.js
│   ├── common/responses/api-response.js
│   ├── common/utils/phan-trang.js
│   ├── common/utils/tien.js
│   ├── common/utils/ngay.js
│   ├── common/utils/tao-ma.js
│   ├── database/pool.js
│   ├── database/query.js
│   ├── database/transaction.js
│   ├── routes/index.js
│   ├── app.js
│   └── server.js
└── tests/
```

**Viết theo chuỗi phụ thuộc:**

| Thứ tự | File | Viết trước khi dùng ở đâu |
|---:|---|---|
| 1 | `backend/package.json` → `package-lock.json` | Cài Express, `pg`, validation, bảo mật, logger, test framework. Khai báo `dev`, `start`, `test`; cài dependency sinh lockfile. |
| 2 | `backend/.env.example`, `src/config/environment.js` | Khai báo và kiểm tra biến môi trường khi khởi động; không hardcode password hoặc URL API AI. |
| 3 | `src/config/cors.js`, `session.js`, `security.js` | Quy định origin, cookie, CSRF với endpoint dùng cookie, header bảo mật, rate-limit. Chỉ bật cấu hình cần cho cơ chế auth đã chọn. |
| 4 | `common/errors/*`, `common/responses/api-response.js` | Chuẩn hóa lỗi và response theo `contracts/` trước khi module đầu tiên trả JSON. |
| 5 | `common/validators/*`, `common/middlewares/kiem-tra-du-lieu.js` | Validation request, kiểu tiền/ngày/phân trang; giá trị tiền không tính bằng float. |
| 6 | `common/utils/*` | Chỉ đưa hàm thật sự tái sử dụng vào đây; không trộn quy tắc bán/mượn vào utils. |
| 7 | `database/pool.js` → `query.js` → `transaction.js` | Pool kết nối → truy vấn có tham số → API transaction cùng client. Repository sẽ nhận đúng transaction context. |
| 8 | `common/middlewares/xu-ly-loi.js`, `gioi-han-tan-suat.js` | Xử lý lỗi tập trung, không lộ chi tiết DB và hạn chế request. |
| 9 | `routes/index.js` → `app.js` → `server.js` | Đăng ký `/health` và `/api/...`, middleware, 404/error; `server.js` chỉ khởi động và xử lý shutdown. |
| 10 | `backend/tests/` | Test `/health`, lỗi request, pool/transaction, cấu hình sai và graceful shutdown. |

**Kiểm tra:** gọi `/health` nhận response đúng hợp đồng; PostgreSQL dừng thì health phụ thuộc trả trạng thái thích hợp; chưa có logic nghiệp vụ trong `app.js` hoặc `server.js`. **Xong F04 khi:** API khởi động độc lập, có kết nối DB và chuẩn lỗi chung.

## F05. Tạo đăng nhập, đơn vị, chi nhánh và phân quyền

**Điều kiện:** migration `002`, `003` và backend base F04 đã chạy.

```text
backend/src/common/middlewares/
├── xac-thuc.js
├── phan-quyen.js
├── pham-vi-don-vi.js
└── pham-vi-chi-nhanh.js

backend/src/modules/
├── auth/
├── tai-khoan/
├── don-vi/
├── chi-nhanh/
└── phan-quyen/
```

**Làm từng module theo cùng thứ tự file:** `<nghiep-vu>.validation.js` → `<nghiep-vu>.repository.js` → `<nghiep-vu>.service.js` → `<nghiep-vu>.controller.js` → `<nghiep-vu>.permission.js` (khi cần) → `<nghiep-vu>.route.js` → test. Không cần tạo file `permission` cho module không có thao tác cần phân quyền riêng.

1. `auth/` → đăng ký, đăng nhập/đăng xuất, reset mật khẩu, quản lý phiên; mật khẩu băm; token/OTP chỉ lưu hash khi cần. Test login sai, hết hạn, thu hồi phiên.
2. `tai-khoan/` → hồ sơ tài khoản, thay đổi thông tin; không tự tạo phiên đăng nhập lần hai.
3. `don-vi/` → tạo đơn vị SaaS, cấu hình tenant, vòng đời đơn vị. Test không đọc chéo dữ liệu.
4. `chi-nhanh/` → danh sách chi nhánh và phạm vi nhân viên. Test nhân viên chỉ truy cập đúng chi nhánh.
5. `phan-quyen/` → CRUD vai trò, gán quyền và vai trò theo đơn vị/chi nhánh; seed quyền chuẩn từ DB.
6. **Sau khi service chạy được**, viết `xac-thuc.js` → `pham-vi-don-vi.js` → `pham-vi-chi-nhanh.js` → `phan-quyen.js`; middleware chỉ lấy ngữ cảnh xác thực và áp quyền, service kiểm tra lại quyền sở hữu bản ghi khi thay đổi dữ liệu.
7. Đăng ký route module vào `backend/src/routes/index.js`; cập nhật `contracts/openapi/bookflow-api.yaml`, docs và test API/authorization.

**Kiểm tra:** khách chưa đăng nhập xem API sách công khai; API quản lý trả 401/403 đúng trường hợp; user không thể đổi `don_vi_id` trong body để truy cập tenant khác. **Xong F05 khi:** API trả được ngữ cảnh tài khoản, đơn vị, chi nhánh và quyền thực tế.

## F06. Tạo khung Frontend render được trang thật

```text
frontend/
├── package.json
├── package-lock.json
├── .env.example
├── .dockerignore
└── src/
    ├── config/handlebars.js
    ├── config/environment.js
    ├── config/dinh-tuyen.js
    ├── helpers/register-helpers.js
    ├── helpers/dinh-dang-tien.js
    ├── helpers/dinh-dang-ngay.js
    ├── helpers/so-sanh.js
    ├── services/backend-client.js
    ├── services/page-data.service.js
    ├── middlewares/tai-nguoi-dung.js
    ├── middlewares/yeu-cau-dang-nhap.js
    ├── middlewares/kiem-tra-quyen-xem-trang.js
    ├── middlewares/trang-loi.js
    ├── routes/public.route.js
    ├── routes/auth.route.js
    ├── routes/customer.route.js
    ├── routes/staff.route.js
    ├── routes/admin.route.js
    ├── routes/super-admin.route.js
    ├── controllers/public/
    ├── controllers/auth/
    ├── controllers/customer/
    ├── controllers/staff/
    ├── controllers/admin/
    ├── controllers/super-admin/
    ├── views/layouts/
    ├── views/partials/
    ├── views/components/
    ├── views/pages/
    ├── app.js
    └── server.js
```

**Thứ tự viết:**

1. `frontend/package.json` → cài Express, express-handlebars và dependency render; sinh `package-lock.json`. Viết `.env.example` cho backend nội bộ và URL công khai; tuyệt đối không đưa khóa backend vào JS browser.
2. `src/config/environment.js` → `handlebars.js` → `helpers/register-helpers.js`; đăng ký đường dẫn `views/layouts/partials` và helper `dinh-dang-tien`, `dinh-dang-ngay`, `so-sanh`.
3. `views/layouts/main.hbs` → `views/pages/public/trang-chu.hbs` → `routes/public.route.js` → controller tương ứng → `app.js` → `server.js`. **Mục tiêu đầu tiên là GET `/` render được HTML thực**, không phụ thuộc API sách.
4. `services/backend-client.js` → client gọi BE từ server render theo hợp đồng, có timeout, xử lý 401/403 và truyền request ID; `page-data.service.js` chỉ phối hợp dữ liệu cho trang.
5. `middlewares/tai-nguoi-dung.js`, `yeu-cau-dang-nhap.js`, `kiem-tra-quyen-xem-trang.js`, `trang-loi.js` → dùng ngữ cảnh auth do BE xác nhận; không thay quyền backend.
6. `routes/auth.route.js` và `controllers/auth/` → `views/layouts/auth.hbs`, `views/pages/auth/dang-nhap.hbs`, `dang-ky.hbs`, `quen-mat-khau.hbs`, `dat-lai-mat-khau.hbs`.
7. `views/layouts/customer.hbs`, `staff.hbs`, `admin.hbs`, `super-admin.hbs` → sau đó mới mở `customer.route.js`, `staff.route.js`, `admin.route.js`, `super-admin.route.js`. Chưa có trang nghiệp vụ thì không render menu chết.
8. `frontend/tests/` → test render công khai, redirect khi cần auth, trang 403, lỗi backend, HTML không chứa thông tin bí mật.

**Kiểm tra:** mở `/` khi chưa đăng nhập, đi được tới trang đăng nhập, login qua BE, trang quản trị chỉ xuất hiện theo quyền. **Xong F06 khi:** FE và BE chạy riêng và giao tiếp qua API.

## F07. Tạo bộ nhận diện và SVG gốc trước khi làm component icon

```text
frontend/src/assets/
├── brand/
│   ├── bookflow-logo.svg
│   ├── bookflow-symbol.svg
│   ├── bookflow-logo-sang.svg
│   ├── bookflow-logo-toi.svg
│   └── favicon.svg
└── icons/
    ├── navigation/          # trang-chu.svg, tong-quan.svg, menu.svg...
    ├── sach/                # sach.svg, sach-mo.svg, tim-sach.svg...
    ├── nghiep-vu/          # gio-hang.svg, kho.svg, muon-sach.svg...
    ├── actions/             # them.svg, sua.svg, xoa.svg, tim-kiem.svg...
    ├── status/              # thanh-cong.svg, canh-bao.svg, loi.svg...
    └── ai/                  # tro-ly-ai.svg, tim-kiem-ai.svg...

frontend/scripts/
├── build-icons.mjs
├── build-assets.mjs
└── build-templates.mjs
```

1. `docs/frontend/he-thong-thiet-ke.md`, `docs/frontend/quy-uoc-icon.md`: chốt màu, kích thước, nét, `viewBox`, tên icon và quy định tự vẽ; không nhúng font của nguồn khác vào artifact.
2. Vẽ `assets/brand/bookflow-symbol.svg` → `bookflow-logo.svg` → hai biến thể nền → `favicon.svg`. Mỗi file có mục đích riêng; logo không đưa vào sprite icon tác vụ.
3. Vẽ SVG nhóm `navigation/`, `actions/`, `status/` **đang cần cho layout trước**; nhóm `sach/`, `nghiep-vu/`, `ai/` bổ sung khi làm màn hình tương ứng, không phải vẽ toàn bộ một lần.
4. `frontend/scripts/build-icons.mjs`: kiểm tra XML SVG, trùng ID/tên, loại bỏ mã không an toàn, đóng gói thành `src/public/icons/bookflow-icons.svg`; hỗ trợ `currentColor`.
5. `frontend/scripts/build-assets.mjs`: copy logo/favicon và gói CSS/JS theo cấu hình; `build-templates.mjs` chỉ thêm nếu có bước biên dịch template thực tế.
6. `src/views/partials/ui/icon.hbs` → `src/public/css/components/icon.css` → dùng icon trong navigation và button; với icon cần tên đọc được, bổ sung text/`aria-label` ở phần tử điều khiển.
7. Test build icon hai lần cho kết quả nhất quán; thử icon ở 16/20/24 px, nền sáng/tối; thiếu icon phải báo rõ.

**Xong F07 khi:** trang công khai hiển thị logo và icon tự thiết kế, không còn SVG copy-paste trong từng trang.

## F08. Tạo form, bảng, modal và JS/CSS chung trước màn hình CRUD

**Thứ tự tạo file giao diện:**

```text
frontend/src/views/partials/
├── navigation/
│   ├── dau-trang.hbs
│   ├── chan-trang.hbs
│   ├── thanh-ben.hbs
│   ├── duong-dan.hbs
│   ├── menu-tai-khoan.hbs
│   └── menu-thong-bao.hbs
├── ui/
│   ├── icon.hbs
│   ├── nut-bam.hbs
│   ├── nhan.hbs
│   ├── dang-tai.hbs
│   ├── khong-co-du-lieu.hbs
│   └── nhan-trang-thai.hbs
├── forms/
│   ├── truong-van-ban.hbs
│   ├── truong-so.hbs
│   ├── truong-email.hbs
│   ├── truong-mat-khau.hbs
│   ├── truong-tien.hbs
│   ├── truong-ngay.hbs
│   ├── truong-ngay-gio.hbs
│   ├── truong-chon.hbs
│   ├── truong-chon-nhieu.hbs
│   ├── truong-nhieu-dong.hbs
│   ├── truong-tich-chon.hbs
│   ├── truong-chon-mot.hbs
│   ├── truong-tep.hbs
│   ├── truong-hinh-anh.hbs
│   ├── loi-truong.hbs
│   └── nut-bieu-mau.hbs
├── tables/
│   ├── bang-du-lieu.hbs
│   ├── thanh-cong-cu.hbs
│   ├── bo-loc.hbs
│   ├── phan-trang.hbs
│   ├── bang-trong.hbs
│   └── bang-dang-tai.hbs
├── modals/
│   ├── hop-thoai-goc.hbs
│   ├── hop-thoai-bieu-mau.hbs
│   ├── hop-thoai-xac-nhan.hbs
│   └── hop-thoai-chi-tiet.hbs
└── feedback/
    ├── thong-bao-noi.hbs
    ├── canh-bao.hbs
    ├── trang-loi.hbs
    └── khong-du-quyen.hbs
```

**Viết theo dependency, không theo alphabet:**

1. `src/public/css/base/bien-mau.css` → `kieu-chu.css` → `dat-lai.css` → `tien-ich.css`; sau đó `css/layouts/cong-khai.css`, `xac-thuc.css`, `khach-hang.css`, `tong-quan.css`, `thanh-ben.css`. Chỉ thêm CSS theo layout khi layout xuất hiện.
2. `partials/navigation/` → `partials/ui/` → CSS `components/nut-bam.css`, `icon.css`, `thong-bao.css`, `menu-xo-xuong.css` để layout không phụ thuộc style từng trang.
3. `public/js/core/goi-api.js` → `utils/dinh-dang-tien.js`, `doc-so-tien.js`, `dinh-dang-ngay.js`, `chong-goi-lien-tuc.js`, `tham-so-duong-dan.js`.
4. `partials/forms/loi-truong.hbs` → các trường nhập đơn giản → `truong-tien.hbs`, `truong-ngay-gio.hbs`, `truong-tep.hbs`, `truong-hinh-anh.hbs` → `nut-bieu-mau.hbs`.
5. `public/js/core/kiem-tra-bieu-mau.js` → `xu-ly-bieu-mau.js` → `tai-tep-len.js` → `xem-truoc-anh.js`; các kiểm tra BE vẫn là nguồn xác nhận cuối.
6. `partials/modals/hop-thoai-goc.hbs` → `hop-thoai-xac-nhan.hbs`, `hop-thoai-bieu-mau.hbs`, `hop-thoai-chi-tiet.hbs` → JS `hop-thoai.js`, `xac-nhan.js`, `thong-bao-noi.js`.
7. `partials/tables/bang-du-lieu.hbs` → `thanh-cong-cu.hbs`, `bo-loc.hbs`, `phan-trang.hbs`, trạng thái trống/đang tải → JS `bang-du-lieu.js`, `phan-trang.js`, `tim-kiem.js`; CSS `bang-du-lieu.css`, `bieu-mau.css`, `hop-thoai.css`.
8. `docs/frontend/quy-uoc-bieu-mau.md`: quy định cách truyền `mode`, dữ liệu, lỗi, disabled/readonly, submit; test form tạo/sửa, lỗi server, modal bàn phím và bảng rỗng.

**Xong F08 khi:** có một trang demo nội bộ dùng được form, modal và bảng chỉ bằng cấu hình; không phụ thuộc module sách.

## F09. Tạo module upload dùng chung trước khi thêm ảnh sách

```text
backend/src/integrations/storage-client.js
backend/src/modules/tep-dinh-kem/
├── tep.validation.js
├── tep.repository.js
├── tep.service.js
├── tep.permission.js
├── tep.controller.js
├── tep.route.js
├── processors/
│   ├── xu-ly-hinh-anh.js
│   └── doc-thong-tin-tep.js
└── tests/tep.service.test.js

frontend/src/public/js/core/
├── tai-tep-len.js
└── xem-truoc-anh.js
```

**Thứ tự:** `storage-client.js` (MinIO, bucket/object key, private URL) → processor đọc loại MIME/dung lượng/ảnh → validation → repository bảng `tep_dinh_kem` → service upload/đổi/xóa có kiểm soát → permission → controller/route → FE upload/preview dùng chung → test. Ảnh thật không lưu vào `public/images/` và không lưu blob trong PostgreSQL.

**Kiểm tra:** file không hợp lệ bị từ chối; file riêng không thể truy cập bằng URL đoán; object được lưu và metadata tương ứng; thao tác lỗi không để lại metadata trỏ tới object hỏng. **Xong F09 khi:** backend có một API file chung để module sách, khách hàng và chứng từ cùng sử dụng.

## F10. Tạo danh mục sách theo lát cắt hoàn chỉnh BE → FE

```text
backend/src/modules/sach/
├── sach.constant.js
├── sach.validation.js
├── sach.repository.js
├── sach.service.js
├── sach.permission.js
├── sach.mapper.js
├── sach.controller.js
├── sach.route.js
├── phien-ban/
│   ├── phien-ban.repository.js
│   ├── phien-ban.service.js
│   ├── phien-ban.controller.js
│   └── phien-ban.route.js
├── media/
│   ├── hinh-anh-sach.service.js
│   └── hinh-anh-sach.controller.js
└── tests/
    ├── sach.service.test.js
    └── sach.controller.test.js

frontend/src/public/js/services/sach.api.js
frontend/src/public/js/modules/sach/
├── danh-sach-sach.js
├── bieu-mau-sach.js
├── bo-suu-tap-anh.js
└── chi-tiet-sach.js

frontend/src/views/pages/staff/sach/
├── danh-sach-sach.hbs
├── them-sach.hbs
├── sua-sach.hbs
├── chi-tiet-sach.hbs
└── partials/
    ├── bieu-mau-sach.hbs
    ├── thong-tin-co-ban.hbs
    ├── thong-tin-phien-ban.hbs
    ├── hinh-anh-sach.hbs
    └── hinh-thuc-cung-cap.hbs
```

**Thứ tự viết từng file:**

1. DB `005_danh_muc_sach.sql` chạy được → hợp đồng sách/phiên bản trong `contracts/` → `sach.constant.js`, `sach.validation.js`.
2. `sach.repository.js` → `sach.service.js` → `sach.permission.js` → `sach.mapper.js` → `sach.controller.js` → `sach.route.js` → đăng ký `routes/index.js` → test CRUD/tenant.
3. Thực hiện `phien-ban/` theo thứ tự repository → service → controller → route, kiểm tra ISBN, phiên bản và quan hệ đầu sách.
4. `media/hinh-anh-sach.service.js` gọi `tep-dinh-kem/` → `hinh-anh-sach.controller.js`; kiểm tra ảnh bìa chính, ảnh phụ, thứ tự và phạm vi công khai. **Không tự viết lại upload**.
5. `frontend/src/public/js/services/sach.api.js` → `views/components/sach/the-sach.hbs`, `bo-suu-tap-anh.hbs`, `trang-thai-sach.hbs`, `hinh-thuc-cung-cap.hbs`.
6. Trang `public/danh-sach-sach.hbs`, `chi-tiet-sach.hbs`, `tim-kiem.hbs` → JS giao diện công khai; khách chưa login vẫn xem được.
7. `staff/sach/partials/thong-tin-co-ban.hbs` → `thong-tin-phien-ban.hbs` → `hinh-anh-sach.hbs` → `hinh-thuc-cung-cap.hbs` → gộp `bieu-mau-sach.hbs`.
8. `staff/sach/them-sach.hbs` và `sua-sach.hbs` **cùng include** `bieu-mau-sach.hbs`; `danh-sach-sach.hbs`, `chi-tiet-sach.hbs` dùng component chung → JS `bieu-mau-sach.js`, `bo-suu-tap-anh.js` → CSS `pages/sach.css`.
9. Test luồng browser: tạo sách → tải ảnh → thêm phiên bản → công khai → tìm thấy ở trang công khai; sửa sách không tạo bản ghi trùng.

**Xong F10 khi:** danh mục sách chạy end-to-end, một form dùng cho thêm/sửa và ảnh gắn đúng `tep_sach`/`tep_dinh_kem`.

## F11. Tạo nhà cung cấp và kho sau danh mục sách

**DB trước:** chạy `006_nha_cung_cap_va_kho.sql`, viết constraint chống sai tồn kho, unique bản sao và tham chiếu chi nhánh.

```text
backend/src/modules/nha-cung-cap/
backend/src/modules/kho/
frontend/src/public/js/services/kho.api.js
frontend/src/public/js/modules/kho/
frontend/src/views/pages/staff/kho/
├── ton-kho.hbs
├── ban-sao-sach.hbs
├── nhap-kho.hbs
└── chuyen-kho.hbs
```

1. Trong `nha-cung-cap/`: validation → repository → service → controller → route → test.
2. Trong `kho/`: viết repository lô nhập, phiếu nhập, tồn bán, bản sao sách và biến động; sau đó service giao dịch nhập/chuyển/kiểm kê/đặt giữ. `transaction.js` dùng chung cho trừ tồn và chuyển trạng thái bản sao.
3. Viết endpoint chi nhánh, mã vạch/bản sao, nhập kho, điều chuyển và tra cứu biến động; không thay thế log biến động bằng cập nhật số lượng đơn thuần.
4. `kho.api.js` → `staff/kho/ton-kho.hbs` → `ban-sao-sach.hbs` → `nhap-kho.hbs` → `chuyen-kho.hbs` → JS `modules/kho/` → CSS `pages/kho.css`.
5. Test đồng thời hai yêu cầu giữ/mượn một bản sao; lô nhập thất bại phải rollback; chuyển kho phải có lịch sử nguồn/đích.

**Xong F11 khi:** nhập kho làm phát sinh tồn đúng, một bản sao chỉ có một trạng thái phân bổ hợp lệ và không thể bị cấp đồng thời cho hai giao dịch.

## F12. Tạo khách hàng và hội viên

**DB trước:** `007_khach_hang_va_hoi_vien.sql`.

```text
backend/src/modules/khach-hang/
backend/src/modules/hoi-vien/
frontend/src/public/js/services/khach-hang.api.js
frontend/src/public/js/services/hoi-vien.api.js
frontend/src/views/pages/staff/khach-hang/
├── danh-sach-khach-hang.hbs
├── chi-tiet-khach-hang.hbs
└── partials/bieu-mau-khach-hang.hbs
frontend/src/views/components/khach-hang/the-khach-hang.hbs
frontend/src/views/components/hoi-vien/the-goi-hoi-vien.hbs
```

1. `khach-hang/`: validation → repository → service → controller → route → test. Hỗ trợ khách tại quầy không có tài khoản (`tai_khoan_id` có thể rỗng theo quy tắc đã chốt).
2. `hoi-vien/`: repository gói/quyền lợi/đăng ký/lịch sử sử dụng → service kiểm tra hiệu lực và hạn mức → controller/route → test.
3. `khach-hang.api.js`, `hoi-vien.api.js` → thẻ khách/hội viên → form khách dùng chung thêm/sửa → trang danh sách/chi tiết → trang khách `customer/hoi-vien.hbs` và công khai `public/goi-hoi-vien.hbs`.
4. Test khách đăng ký gói, hết hạn, quyền lợi được sử dụng đúng một lần theo giao dịch; không tự cộng quyền lợi từ hai gói nếu chính sách không cho phép.

**Xong F12 khi:** nhân viên quản lý khách và hệ thống trả được quyền lợi hội viên thực tế cho các service bán/mượn.

## F13. Tạo nền tài chính trước khi hoàn tất bán và cho thuê

**DB:** các bảng nguồn bán/mượn được tạo bởi migration `008`, `009` khi cần; chạy `010_tai_chinh_va_thanh_toan.sql` và FK liên quan trước khi bật chức năng thu tiền. Số thứ tự migration đích được điều chỉnh nếu phát sinh vòng FK.

```text
backend/src/modules/thanh-toan/
backend/src/integrations/payment-provider.js
frontend/src/public/js/services/thanh-toan.api.js
frontend/src/views/components/thanh-toan/
├── trang-thai-thanh-toan.hbs
└── phuong-thuc-thanh-toan.hbs
```

1. Repository khoản phải thu → service tính/ghi khoản phải thu (snapshot giá/tiền tệ/thuế khi áp dụng) → bảng phân bổ thanh toán.
2. `payment-provider.js`: adapter thanh toán, xác minh callback và khóa idempotency; không lưu dữ liệu thẻ nhạy cảm.
3. Service thu tiền → xác nhận → phân bổ → thu/hoàn cọc → hoàn tiền → đối soát; tất cả giao dịch tiền cần audit và cơ chế chống xử lý lặp.
4. Controller/route/permission → cập nhật OpenAPI → `thanh-toan.api.js` → hai component trạng thái/phương thức, trang chi tiết và test.
5. Test retry callback, trả một phần, hoàn tiền, cọc chưa phải doanh thu, lệch số tiền và rollback giao dịch lỗi.

**Xong F13 khi:** một khoản phải thu có thể thanh toán/hoàn đúng, không thu trùng và luôn đối soát được.

## F14. Tạo giỏ hàng và bán sách

**DB:** `008_ban_hang.sql` đã có các bảng cần thiết; xác nhận tích hợp với thanh toán F13 và kho F11.

```text
backend/src/modules/gio-hang/
backend/src/modules/ban-hang/
frontend/src/public/js/services/ban-hang.api.js
frontend/src/public/js/modules/ban-hang/
frontend/src/views/pages/customer/
├── gio-hang.hbs
├── thanh-toan.hbs
├── don-hang.hbs
└── chi-tiet-don-hang.hbs
frontend/src/views/pages/staff/ban-hang/
├── ban-hang-tai-quay.hbs
├── danh-sach-don.hbs
├── chi-tiet-don.hbs
└── tra-hang.hbs
```

**Thứ tự:** `gio-hang` repository/service/API → giỏ FE → `ban-hang` validation/repository/service/controller/route → tích hợp giữ tồn F11 + khoản phải thu F13 trong transaction → `ban-hang.api.js` → checkout khách → đơn hàng → POS nhân viên → đổi/trả → test. `public/js/core/quet-ma-vach.js` chỉ xử lý tín hiệu scanner; xác nhận sách và tồn thuộc backend.

**Kiểm tra:** hai đơn tranh sản phẩm cuối, retry checkout, đơn thất bại nhả giữ chỗ, số tiền trên đơn là snapshot, trả hàng có chứng từ và bút toán phù hợp. **Xong F14 khi:** đi được từ giỏ/POS đến đơn thanh toán và xử lý trả hàng.

## F15. Tạo đặt trước, mượn miễn phí, thuê có phí và trả/gia hạn

**DB:** `009_muon_tra.sql`; dùng bản sao từ F11, khách/hội viên F12, khoản phải thu/cọc F13.

```text
backend/src/modules/muon-tra/
frontend/src/public/js/services/muon-tra.api.js
frontend/src/public/js/modules/muon-tra/
frontend/src/views/pages/customer/
├── yeu-cau-muon.hbs
├── sach-dang-muon.hbs
├── chi-tiet-phieu-muon.hbs
└── dat-truoc-sach.hbs
frontend/src/views/pages/staff/muon-tra/
├── danh-sach-phieu-muon.hbs
├── tao-phieu-muon.hbs
├── chi-tiet-phieu-muon.hbs
├── nhan-tra-sach.hbs
├── danh-sach-dat-truoc.hbs
└── sach-qua-han.hbs
```

1. Validation chính sách mượn/thuê → repository đặt trước/yêu cầu/phiếu/chi tiết → service xác định bản sao được cấp, hạn trả, quyền lợi hội viên và snapshot chính sách.
2. Service nhận trả từng cuốn → tình trạng cuốn sách → phí quá hạn/hư hỏng → khoản phải thu/tiền cọc → gia hạn có lịch sử; áp transaction và khóa trạng thái bản sao.
3. Controller/route/permission → cập nhật OpenAPI → `muon-tra.api.js` → các trang khách hàng → các trang nhân viên → JS quét mã vạch dùng chung và CSS `muon-tra.css`.
4. Tạo `components/muon-tra/trang-thai-phieu-muon.hbs`, `han-tra.hbs` chỉ hiển thị, không tự tính phí quyết toán trong frontend.
5. Test mượn miễn phí, thuê có phí, trả một phần, gia hạn, quá hạn, mất/hỏng, xử lý hai yêu cầu cùng một bản sao và giới hạn hội viên.

**Xong F15 khi:** có thể đặt trước → cấp sách → nhận trả → quyết toán cọc/phí → trả bản sao về trạng thái sẵn sàng theo điều kiện hợp lệ.

## F16. Tạo Node Worker, thông báo và các tác vụ nền

```text
backend/src/integrations/redis-client.js
backend/src/integrations/email-client.js
backend/src/jobs/
├── queues/
├── processors/
└── schedules/
backend/src/worker.js
backend/src/modules/thong-bao/
frontend/src/views/partials/navigation/menu-thong-bao.hbs
frontend/src/views/pages/customer/thong-bao.hbs
```

**Thứ tự:** Redis client có prefix riêng → định nghĩa queue BullMQ → processor nhắc hạn/thông báo/email → job schedule → `worker.js` chạy tiến trình riêng từ image BE → module thông báo (repository/service/API) → menu/trang thông báo FE → test retry, idempotency, lịch UTC/múi giờ chi nhánh. `email-client.js` chỉ gửi email; template thông báo là nghiệp vụ của `thong-bao/`.

**Kiểm tra:** API không chờ tác vụ gửi email; worker khởi động độc lập; cùng sự kiện không gửi trùng khi retry; worker chết rồi khởi động lại không mất tác vụ đã được lưu đúng. **Xong F16 khi:** tác vụ nền Node hoạt động mà không ảnh hưởng request bán/mượn.

## F17. Tạo Python AI theo từng file, không gắn AI vào Express

**Điều kiện:** API sách đã chạy, quyền tenant hoạt động; DB có migration `012_du_lieu_ai.sql` và pgvector. Không dùng dữ liệu sách chưa có quyền lập chỉ mục.

```text
ai-service/
├── requirements.txt
├── .env.example
├── .dockerignore
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── dependencies.py
│   │   ├── security.py
│   │   ├── exceptions.py
│   │   └── logging.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── tro_chuyen.py
│   │   ├── sach.py
│   │   ├── bao_cao.py
│   │   └── tac_vu.py
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── provider.py
│   │   ├── client.py
│   │   └── response_parser.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── vector.py
│   │   ├── hoi_thoai.py
│   │   └── tac_vu_ai.py
│   ├── embeddings/
│   │   ├── __init__.py
│   │   ├── embedding_service.py
│   │   └── indexing_service.py
│   ├── retrieval/
│   │   ├── __init__.py
│   │   ├── permission_filter.py
│   │   ├── keyword_search.py
│   │   └── vector_search.py
│   ├── prompts/
│   │   ├── tu_van_sach.txt
│   │   ├── phan_loai_sach.txt
│   │   └── phan_tich_bao_cao.txt
│   ├── services/
│   │   ├── __init__.py
│   │   ├── tu_van_sach.py
│   │   ├── phan_loai_sach.py
│   │   ├── phan_tich_bao_cao.py
│   │   └── quan_ly_hoi_thoai.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── tro_chuyen.py
│   │   ├── sach.py
│   │   ├── bao_cao.py
│   │   ├── lap_chi_muc.py
│   │   └── tac_vu.py
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── queue.py
│   │   ├── worker.py
│   │   └── tasks/
│   │       ├── __init__.py
│   │       ├── lap_chi_muc_sach.py
│   │       ├── phan_loai_sach.py
│   │       └── phan_tich_bao_cao.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── van_ban.py
│   │   └── dinh_danh.py
│   └── main.py
├── tests/
├── Dockerfile.api
└── Dockerfile.worker
```

**Thứ tự tạo và viết:**

1. `requirements.txt` (version cố định/lock theo cách quản lý đã chọn), `.env.example`, `app/__init__.py`, `app/config.py` → kiểm tra Python import và cấu hình.
2. `core/security.py`, `dependencies.py`, `exceptions.py`, `logging.py` → xác thực BE→Python bằng service identity; nhận `don_vi_id` đã kiểm chứng từ BE, request ID và giới hạn quyền.
3. `schemas/*.py` → request/response Pydantic khớp `contracts/openapi/ai-noi-bo-api.yaml`.
4. `llm/provider.py` → `client.py` → `response_parser.py`: một client/provider abstraction, timeout/retry/budget và kiểm tra output.
5. `repositories/vector.py`, `hoi_thoai.py`, `tac_vu_ai.py` → quyền đọc/ghi đúng dữ liệu AI, không cấp quyền sửa đơn hàng, thanh toán hay kho.
6. `embeddings/embedding_service.py` → `indexing_service.py` → `retrieval/permission_filter.py` → `keyword_search.py` → `vector_search.py`. Lọc tenant/ACL **trước và trong** truy xuất, không chỉ lọc kết quả sau khi LLM đã đọc.
7. `prompts/*.txt` → `services/tu_van_sach.py`, `phan_loai_sach.py`, `phan_tich_bao_cao.py`, `quan_ly_hoi_thoai.py`. Chỉ tạo gợi ý; giá/tồn/hạn mức được đối chiếu API BE.
8. `api/tro_chuyen.py`, `sach.py`, `bao_cao.py`, `lap_chi_muc.py`, `tac_vu.py` → `main.py` đăng ký router và `/health`; test API bằng provider AI giả lập.
9. `workers/queue.py` → `workers/tasks/*.py` → `workers/worker.py`. Python dùng RQ; BE gọi FastAPI tạo job, **không đưa job BullMQ trực tiếp vào RQ**.
10. `backend/src/integrations/ai-client.js` → `backend/src/modules/ai/` (validation/repository khi cần/service/controller/route) → frontend `public/js/modules/ai/` và trang chat/tìm kiếm khi API đã ổn.
11. Viết `Dockerfile.api`, `Dockerfile.worker` cuối cùng; chạy riêng hai tiến trình Python, rồi mới ghép Compose.

**Kiểm tra:** một đầu sách được cập nhật → tạo job indexing → worker xử lý → người dùng hỏi → kết quả chỉ gồm sách đúng tenant và quyền công khai; khi API AI lỗi, bán/mượn vẫn chạy bình thường. **Xong F17 khi:** FastAPI và RQ worker build/chạy/test riêng được.

## F18. Hoàn thiện phần còn lại, Docker, build riêng/chung và phát hành

### F18.1. Báo cáo, SaaS, cài đặt, nhật ký

- `backend/src/modules/bao-cao/` và `frontend/src/views/pages/admin/bao-cao/`: repository truy vấn/report service → API → bộ lọc báo cáo → xuất file qua job khi nặng.
- `backend/src/modules/saas/` và `frontend/src/views/pages/super-admin/{don-vi,goi-dich-vu,dang-ky-dich-vu,hoa-don,su-dung-ai,nhat-ky,cai-dat}/`: migration `013_thanh_toan_saas.sql` → gói/đăng ký/hạn mức → hóa đơn/thu phí SaaS → FE; không trộn doanh thu SaaS với giao dịch bán sách của tenant.
- `backend/src/modules/cai-dat/`, `nhat-ky/` và `frontend/src/views/pages/admin/{cai-dat,phan-quyen,chi-nhanh,nhan-vien}/`: cấu hình theo scope, log thay đổi quyền và giao dịch, kiểm tra truy cập.
- Hoàn thiện `frontend/src/views/pages/staff/`, `customer/`, `admin/`, `super-admin/` **chỉ khi** API tương ứng có thật; không tạo nút dẫn đến trang trống.

### F18.2. Viết Dockerfile sau khi từng app chạy ngoài Docker

| Thứ tự | File | Điều kiện và nội dung |
|---:|---|---|
| 1 | `frontend/.dockerignore`, `frontend/Dockerfile` | FE đã render/test; build assets, icon và chạy Express bằng user hạn chế. |
| 2 | `backend/.dockerignore`, `backend/Dockerfile` | API đã test; image không mang secret; `backend-worker` dùng lại image này với command khác. |
| 3 | `ai-service/.dockerignore`, `Dockerfile.api`, `Dockerfile.worker` | Python API/worker đã test; cùng mã nguồn nhưng hai image/entrypoint độc lập. |
| 4 | `database/Dockerfile.migrate` | Runner đã test trên DB sạch; chạy như job riêng, không tự chạy từ mọi service. |
| 5 | `compose.yaml` | Bổ sung `frontend`, `backend`, `backend-worker`, `ai-api`, `ai-worker`, `nginx` cùng Postgres/Redis/MinIO, volume, network và healthcheck. |
| 6 | `compose.dev.yaml` | Mount code/hot reload, chỉ mở cổng local cần thiết. |
| 7 | `compose.stable.yaml`, `compose.production.yaml` | Dùng image đã build và có tag; không tự rebuild khác với image đã kiểm thử. |

**Cách kiểm tra:** build từng image `frontend`/`backend`/`ai-api`/`ai-worker` → chạy riêng service với phụ thuộc đã sẵn sàng → build chung → dùng `docker compose config` kiểm tra tất cả Compose variant. Chỉ Nginx mở cổng công khai trên production.

### F18.3. Viết Nginx và scripts đúng sau khi biết service thực

```text
infrastructure/nginx/
├── nginx.conf
├── templates/phat-trien.conf.template
├── templates/san-xuat.conf.template
└── README.md

scripts/
├── build/
│   ├── build-all.sh
│   ├── build-frontend.sh
│   ├── build-backend.sh
│   ├── build-ai-api.sh
│   └── build-ai-worker.sh
├── deploy/
│   ├── deploy-dev.sh
│   ├── deploy-stable.sh
│   ├── deploy-production.sh
│   └── deploy-service.sh
├── database/
│   ├── migrate.sh
│   └── seed.sh
└── backup/
    ├── backup-database.sh
    └── restore-database.sh
```

1. `infrastructure/nginx/nginx.conf` → hai template env → proxy FE/BE, HTTPS production, size upload, header và timeout phù hợp; không public FastAPI, PostgreSQL, Redis hay MinIO.
2. `scripts/build/build-frontend.sh`, `build-backend.sh`, `build-ai-api.sh`, `build-ai-worker.sh` → `build-all.sh` gọi cùng logic; thêm script vào root `package.json` (`build`, `build:frontend`, `build:backend`, `build:ai-api`, `build:ai-worker`, `build:ai`).
3. `scripts/database/migrate.sh`, `seed.sh` → run migration/seed có kiểm soát; production không chạy demo seed.
4. `scripts/deploy/deploy-dev.sh` → `deploy-stable.sh` → `deploy-service.sh` → `deploy-production.sh`: chỉ thay service được chọn, nhưng kiểm thử hợp đồng/migration trước nếu thay đổi tương thích. Stable và production dùng **cùng digest image** đã kiểm thử.
5. `infrastructure/backup/postgres/`, `backup/minio/`, `backup/restore/` → `scripts/backup/backup-database.sh`, `restore-database.sh` → `infrastructure/scripts/verify-backup.sh`: phải thử khôi phục vào môi trường thử nghiệm, không chỉ kiểm tra có file dump.

### F18.4. Viết CI và bộ test cuối

```text
.github/workflows/
├── test-frontend.yml
├── test-backend.yml
├── test-ai.yml
├── test-contracts.yml
├── build-images.yml
├── deploy-stable.yml
└── deploy-production.yml
```

**Thứ tự:** test từng app → test hợp đồng FE/BE/Python → test DB migration trên DB sạch → test nghiệp vụ và đồng thời → build image có tag/digest → triển khai stable → smoke test → production → healthcheck/giám sát/backup. Chỉ dùng action deploy khi đã có credentials trong secret manager; không ghi secret trong YAML.

`docs/deployment/phat-trien.md` → `on-dinh.md` → `san-xuat.md` → `sao-luu-khoi-phuc.md` viết cùng quy trình thật. `docs/architecture/kien-truc-trien-khai.md` cập nhật cổng/network/service theo Compose cuối; `docs/frontend/danh-sach-trang.md` cập nhật khi trang có thật.

**Xong F18 khi:** có thể build riêng bất kỳ app nào, build chung tất cả, migrate độc lập, chạy local/stable/production từ đúng image, khôi phục dữ liệu thử thành công và kiểm tra được tình trạng từng service.

---

# PHẦN III — MẪU QUY TRÌNH ÁP DỤNG CHO MỖI FOLDER NGHIỆP VỤ MỚI

Ví dụ sau này thêm module `khuyen-mai/`, **không** tự nghĩ lại trình tự; đi theo đúng chuỗi dưới đây:

```text
01  docs/business/khuyen-mai.md                Chốt đầu vào, trạng thái, tình huống lỗi
 ↓
02  database/migrations/0xx_khuyen_mai.sql     Bảng/FK/index và test DB
 ↓
03  contracts/openapi/bookflow-api.yaml        Endpoint và request/response
 ↓
04  backend/src/modules/khuyen-mai/
    ├── khuyen-mai.validation.js               Kiểm tra dữ liệu vào
    ├── khuyen-mai.repository.js               Query có tham số + tenant scope
    ├── khuyen-mai.service.js                  Quy tắc nghiệp vụ + transaction
    ├── khuyen-mai.permission.js               Quyền thao tác nếu cần
    ├── khuyen-mai.controller.js               Ánh xạ HTTP → service
    ├── khuyen-mai.route.js                    Đăng ký endpoint/middleware
    └── tests/khuyen-mai.service.test.js       Unit/integration
 ↓
05  backend/src/routes/index.js                Gắn route module
 ↓
06  frontend/src/public/js/services/
    └── khuyen-mai.api.js                      Gọi BE qua API client chung
 ↓
07  frontend/src/views/pages/admin/khuyen-mai/
    ├── danh-sach-khuyen-mai.hbs               Render bảng dùng chung
    ├── them-khuyen-mai.hbs                    Dùng partial form nghiệp vụ
    ├── sua-khuyen-mai.hbs                     Cũng dùng partial đó
    └── partials/bieu-mau-khuyen-mai.hbs       Ghép field dùng chung
 ↓
08  frontend/src/public/js/modules/khuyen-mai/ JS riêng cho hành vi đặc thù
 ↓
09  frontend/src/public/css/pages/             CSS riêng chỉ khi cần
 ↓
10  Test end-to-end → build app bị ảnh hưởng → cập nhật docs
```

**Chốt chống trùng code:** nếu một phần đã có trong `views/partials/forms/`, `views/partials/tables/`, `public/js/core/`, `backend/src/common/`, `backend/src/modules/tep-dinh-kem/`, `ai-service/app/llm/` hoặc `ai-service/app/retrieval/` thì **gọi lại**; chỉ thêm file nghiệp vụ khi có quy tắc mới thực sự khác.

---

# PHẦN IV — CHECKLIST 20 FILE/VIỆC LÀM ĐẦU TIÊN

Đây là thứ tự thao tác thực tế để bắt đầu từ một thư mục `BookFlow/` rỗng. Các folder cha được tạo cùng bước tạo file đầu tiên bên trong.

- [ ] 01. Tạo `BookFlow/` và các folder gốc `frontend/`, `backend/`, `ai-service/`, `database/`, `contracts/`, `infrastructure/`, `scripts/`, `docs/`.
- [ ] 02. Viết `README.md` và `.gitignore`.
- [ ] 03. Viết `.env.example`, `.dockerignore`, `package.json` gốc.
- [ ] 04. Viết `docs/architecture/tong-quan.md` và `ranh-gioi-phan-he.md`.
- [ ] 05. Đưa từ điển vào `docs/database/tu-dien-du-lieu.md`.
- [ ] 06. Viết `contracts/README.md` và `contracts/schemas/loi-api.schema.json`.
- [ ] 07. Khởi tạo `contracts/openapi/bookflow-api.yaml` với `/health` và API sách công khai.
- [ ] 08. Viết `compose.yaml` cho PostgreSQL + pgvector, Redis, MinIO; thêm `compose.dev.yaml`.
- [ ] 09. Chạy và kiểm tra ba dịch vụ dữ liệu local.
- [ ] 10. Tạo `database/package.json`, sinh lockfile và viết `scripts/migrate.js`.
- [ ] 11. Viết `database/scripts/check-migrations.js`, `001_tien_ich_va_extension.sql`.
- [ ] 12. Viết/chạy `002_nen_tang_saas.sql`, `003_tai_khoan_va_phan_quyen.sql`.
- [ ] 13. Viết/chạy `004_metadata_tep.sql`, `005_danh_muc_sach.sql`.
- [ ] 14. Tạo `backend/package.json`, sinh lockfile và viết `config/environment.js`.
- [ ] 15. Viết backend `common/errors/`, `common/responses/api-response.js`.
- [ ] 16. Viết backend `database/pool.js`, `query.js`, `transaction.js`.
- [ ] 17. Viết backend `routes/index.js`, `app.js`, `server.js` và test `/health`.
- [ ] 18. Tạo module `auth/`, `don-vi/`, `chi-nhanh/`, `phan-quyen/` theo thứ tự validation → repository → service → controller → route → test.
- [ ] 19. Tạo `frontend/package.json`, sinh lockfile, viết `config/handlebars.js`, layout `main.hbs`, trang `public/trang-chu.hbs`, `app.js`, `server.js`.
- [ ] 20. Mở trang chủ công khai, gọi được API health và xác nhận không truy cập nhầm dữ liệu tenant; sau đó mới bắt đầu F07 icon và F08 form chung.

**Kết quả cần có sau checklist:** database nền, backend API khỏe, frontend render được trang, auth/tenant có thể kiểm tra và một hướng phát triển file rõ ràng. Đây mới là mốc khung dự án, **chưa** phải ứng dụng BookFlow đã hoàn tất.
