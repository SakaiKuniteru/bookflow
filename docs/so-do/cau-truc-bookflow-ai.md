# BOOKFLOW AI — CẤU TRÚC DỰ ÁN (TÊN KỸ THUẬT TIẾNG ANH, NGHIỆP VỤ TIẾNG VIỆT)

**Bản thiết kế:** 1.1 — bản hiệu chỉnh để duyệt cấu trúc; chưa tạo mã nguồn.  
**Stack:** Handlebars + Bootstrap + JavaScript; Node.js + Express; Python + FastAPI; PostgreSQL + pgvector; Redis; MinIO; Nginx; Docker Compose.  
**Mục tiêu:** giữ đầy đủ cây chính và cây chi tiết, build riêng hoặc chung, tái sử dụng form/component/hàm/icon tự thiết kế.

## Quy ước tên được chốt

- **Giữ tiếng Anh cho lớp kỹ thuật và tên theo chuẩn công cụ:** `frontend/`, `backend/`, `ai-service/`, `database/`, `contracts/`, `infrastructure/`, `scripts/`, `docs/`, `src/`, `views/`, `public/`, `routes/`, `controllers/`, `services/`, `middlewares/`, `helpers/`, `modules/`, `config/`, `common/`, `repositories/`, `schemas/`, `migrations/`, `seeds/`, `tests/`, `Dockerfile`, `package.json`, `compose.dev.yaml`...
- **Dùng tiếng Việt không dấu cho tên nghiệp vụ do dự án tự đặt:** `sach/`, `khach-hang/`, `muon-tra/`, `danh-sach-sach.hbs`, `bieu-mau-sach.hbs`, `sach.service.js`, `sach.repository.js`, `tu_van_sach.py`. Tên file JS sử dụng hậu tố kỹ thuật tiếng Anh như `.route.js`, `.controller.js`, `.service.js`, `.repository.js`, `.validation.js`.
- **JavaScript, HBS, CSS, SVG và shell:** phần tên nghiệp vụ dùng `kebab-case`; **Python:** module nghiệp vụ dùng `snake_case` để `import` bình thường; **PostgreSQL:** bảng/cột tiếng Việt không dấu, `snake_case` như tài liệu dữ liệu đã thống nhất.
- Các nhãn vai trò giao diện có thể giữ `public/`, `auth/`, `customer/`, `staff/`, `admin/`, `super-admin/` để thống nhất layout, route và phân quyền. Không đổi tùy ý tên đường dẫn giữa source, Docker, CI và tài liệu.
- **Build:** `frontend`, `backend`, `ai-api` và `ai-worker` build/triển khai độc lập; Node worker dùng image backend với command riêng. Redis queue của Node (BullMQ) và Python (RQ) độc lập, giao tiếp qua FastAPI nội bộ.

---

# PHẦN I. CẤU TRÚC CHÍNH

```text
BookFlow/
│
├── frontend/                               # Handlebars + Bootstrap + JavaScript
│   ├── src/
│   │   ├── server.js                       # Điểm khởi động HTTP
│   │   ├── app.js                          # Khởi tạo Express phục vụ giao diện
│   │   │
│   │   ├── config/                         # Handlebars, môi trường, định tuyến
│   │   ├── routes/                         # Route giao diện theo khu vực
│   │   ├── controllers/                    # Chuẩn bị dữ liệu và render trang
│   │   ├── services/                       # Client gọi API nghiệp vụ
│   │   ├── middlewares/                    # Người dùng, quyền xem trang, lỗi
│   │   ├── helpers/                        # Handlebars helpers
│   │   │
│   │   ├── views/
│   │   │   ├── layouts/                    # Layout theo khu vực
│   │   │   ├── partials/                   # Form, modal, bảng, điều hướng
│   │   │   ├── components/                 # Card sách, hội viên, trạng thái...
│   │   │   └── pages/                      # Các trang theo vai trò/nghiệp vụ
│   │   │
│   │   ├── assets/
│   │   │   ├── icons/                      # SVG gốc tự thiết kế
│   │   │   └── brand/                      # Logo và favicon gốc tự thiết kế
│   │   │
│   │   └── public/
│   │       ├── css/                        # CSS chung và CSS theo màn hình
│   │       ├── js/                         # JS dùng chung, gọi API và từng trang
│   │       ├── icons/                      # SVG sprite tạo khi build
│   │       ├── brand/                      # Logo sau khi build
│   │       ├── images/                     # Chỉ hình tĩnh của giao diện
│   │       └── fonts/
│   │
│   ├── scripts/                            # Build SVG, tài nguyên và template
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── .dockerignore
│   └── Dockerfile
│
├── backend/                                # Node.js + Express API
│   ├── src/
│   │   ├── server.js                       # Khởi động HTTP API
│   │   ├── app.js                          # Tạo ứng dụng Express
│   │   ├── worker.js                       # Điểm khởi động BullMQ worker
│   │   │
│   │   ├── config/                         # CORS, phiên, bảo mật, môi trường
│   │   ├── common/                         # Lỗi, middleware, validation, utils
│   │   ├── database/                       # Pool, truy vấn, transaction
│   │   ├── integrations/                   # Python AI, Redis, MinIO, email...
│   │   ├── jobs/                           # BullMQ, lịch chạy, processor
│   │   ├── modules/                        # Các module nghiệp vụ độc lập
│   │   └── routes/                         # Tập hợp các API route
│   │
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── .dockerignore
│   └── Dockerfile
│
├── ai-service/                             # Python API và Python Worker
│   ├── app/                                # Gói Python; giữ tên kỹ thuật
│   │   ├── __init__.py
│   │   ├── main.py                         # FastAPI: app.main:app
│   │   ├── config.py
│   │   │
│   │   ├── api/                            # Endpoint AI
│   │   ├── core/                           # Bảo mật, logging, lỗi chung
│   │   ├── schemas/                        # Pydantic request/response
│   │   ├── services/                       # Nghiệp vụ AI
│   │   ├── llm/                            # LLM client và provider
│   │   ├── embeddings/                     # Embedding và lập chỉ mục
│   │   ├── retrieval/                      # Tìm kiếm, RAG và lọc quyền
│   │   ├── repositories/                   # Repository dữ liệu AI
│   │   ├── prompts/                        # Prompt theo chức năng
│   │   ├── workers/                        # RQ worker và job AI
│   │   └── utils/
│   │
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile.api
│   └── Dockerfile.worker
│
├── database/                               # PostgreSQL + pgvector
│   ├── migrations/                         # Giữ tên kỹ thuật của quy trình migration
│   ├── seeds/                              # Seed quyền, vai trò, dữ liệu demo
│   ├── scripts/                            # Chạy/kiểm tra migration
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile.migrate
│   └── README.md
│
├── contracts/                              # Quy ước dữ liệu FE, API, Python
│   ├── openapi/                            # Tên kỹ thuật của chuẩn OpenAPI
│   ├── schemas/                            # JSON Schema
│   ├── examples/                           # Ví dụ request/response
│   └── README.md
│
├── infrastructure/                         # Docker và cấu hình hệ thống
│   ├── nginx/
│   ├── postgres/
│   ├── redis/
│   ├── minio/
│   ├── monitoring/
│   ├── backup/
│   └── scripts/
│
├── scripts/                                # Điều phối toàn dự án
│   ├── build/
│   ├── deploy/
│   ├── database/
│   └── backup/
│
├── docs/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── ai/
│   ├── frontend/
│   ├── deployment/
│   └── business/
│
├── .github/
│   └── workflows/                          # Đường dẫn GitHub Actions bắt buộc
│
├── compose.yaml                            # Compose chung
├── compose.dev.yaml                        # Development
├── compose.stable.yaml                     # Stable
├── compose.production.yaml                 # Production
│
├── .env.example
├── .gitignore
├── .dockerignore
├── package.json                            # Build chung/build riêng
└── README.md
```

**Bốn image ứng dụng build được độc lập:** `frontend`, `backend`, `ai-api`, `ai-worker`. Tiến trình BullMQ phía Node.js có thể chạy bằng image `backend` với lệnh khởi động khác. PostgreSQL, Redis, MinIO và Nginx là dịch vụ hạ tầng; migration được chạy như một tác vụ triển khai riêng.

---

# PHẦN II. CẤU TRÚC CHI TIẾT

## 1. FRONTEND (FE)

### 1.1. `frontend/src/views/` — layout, form, component và trang

```text
frontend/src/views/
│
├── layouts/
│   ├── main.hbs
│   ├── auth.hbs
│   ├── customer.hbs
│   ├── staff.hbs
│   ├── admin.hbs
│   └── super-admin.hbs
│
├── partials/
│   │
│   ├── navigation/
│   │   ├── dau-trang.hbs
│   │   ├── chan-trang.hbs
│   │   ├── thanh-ben.hbs
│   │   ├── duong-dan.hbs
│   │   ├── menu-tai-khoan.hbs
│   │   └── menu-thong-bao.hbs
│   │
│   ├── ui/
│   │   ├── icon.hbs
│   │   ├── nut-bam.hbs
│   │   ├── nhan.hbs
│   │   ├── dang-tai.hbs
│   │   ├── khong-co-du-lieu.hbs
│   │   └── nhan-trang-thai.hbs
│   │
│   ├── forms/
│   │   ├── truong-van-ban.hbs
│   │   ├── truong-so.hbs
│   │   ├── truong-email.hbs
│   │   ├── truong-mat-khau.hbs
│   │   ├── truong-tien.hbs
│   │   ├── truong-ngay.hbs
│   │   ├── truong-ngay-gio.hbs
│   │   ├── truong-chon.hbs
│   │   ├── truong-chon-nhieu.hbs
│   │   ├── truong-nhieu-dong.hbs
│   │   ├── truong-tich-chon.hbs
│   │   ├── truong-chon-mot.hbs
│   │   ├── truong-tep.hbs
│   │   ├── truong-hinh-anh.hbs
│   │   ├── loi-truong.hbs
│   │   └── nut-bieu-mau.hbs
│   │
│   ├── tables/
│   │   ├── bang-du-lieu.hbs
│   │   ├── thanh-cong-cu.hbs
│   │   ├── bo-loc.hbs
│   │   ├── phan-trang.hbs
│   │   ├── bang-trong.hbs
│   │   └── bang-dang-tai.hbs
│   │
│   ├── modals/
│   │   ├── hop-thoai-goc.hbs
│   │   ├── hop-thoai-bieu-mau.hbs
│   │   ├── hop-thoai-xac-nhan.hbs
│   │   └── hop-thoai-chi-tiet.hbs
│   │
│   └── feedback/
│       ├── thong-bao-noi.hbs
│       ├── canh-bao.hbs
│       ├── trang-loi.hbs
│       └── khong-du-quyen.hbs
│
├── components/
│   ├── sach/
│   │   ├── the-sach.hbs
│   │   ├── bo-suu-tap-anh.hbs
│   │   ├── trang-thai-sach.hbs
│   │   └── hinh-thuc-cung-cap.hbs
│   │
│   ├── khach-hang/
│   │   └── the-khach-hang.hbs
│   │
│   ├── hoi-vien/
│   │   └── the-goi-hoi-vien.hbs
│   │
│   ├── kho/
│   │   └── trang-thai-ton-kho.hbs
│   │
│   ├── muon-tra/
│   │   ├── trang-thai-phieu-muon.hbs
│   │   └── han-tra.hbs
│   │
│   └── thanh-toan/
│       ├── trang-thai-thanh-toan.hbs
│       └── phuong-thuc-thanh-toan.hbs
│
└── pages/
    │
    ├── public/
    │   ├── trang-chu.hbs
    │   ├── danh-sach-sach.hbs
    │   ├── chi-tiet-sach.hbs
    │   ├── tim-kiem.hbs
    │   ├── goi-hoi-vien.hbs
    │   └── gioi-thieu.hbs
    │
    ├── auth/
    │   ├── dang-nhap.hbs
    │   ├── dang-ky.hbs
    │   ├── quen-mat-khau.hbs
    │   └── dat-lai-mat-khau.hbs
    │
    ├── customer/
    │   ├── tong-quan.hbs
    │   ├── gio-hang.hbs
    │   ├── thanh-toan.hbs
    │   ├── don-hang.hbs
    │   ├── chi-tiet-don-hang.hbs
    │   ├── yeu-cau-muon.hbs
    │   ├── sach-dang-muon.hbs
    │   ├── chi-tiet-phieu-muon.hbs
    │   ├── dat-truoc-sach.hbs
    │   ├── hoi-vien.hbs
    │   ├── thong-bao.hbs
    │   └── ho-so.hbs
    │
    ├── staff/
    │   ├── tong-quan.hbs
    │   │
    │   ├── sach/
    │   │   ├── danh-sach-sach.hbs
    │   │   ├── them-sach.hbs
    │   │   ├── sua-sach.hbs
    │   │   ├── chi-tiet-sach.hbs
    │   │   └── partials/
    │   │       ├── bieu-mau-sach.hbs
    │   │       ├── thong-tin-co-ban.hbs
    │   │       ├── thong-tin-phien-ban.hbs
    │   │       ├── hinh-anh-sach.hbs
    │   │       └── hinh-thuc-cung-cap.hbs
    │   │
    │   ├── kho/
    │   │   ├── ton-kho.hbs
    │   │   ├── ban-sao-sach.hbs
    │   │   ├── nhap-kho.hbs
    │   │   └── chuyen-kho.hbs
    │   │
    │   ├── ban-hang/
    │   │   ├── ban-hang-tai-quay.hbs
    │   │   ├── danh-sach-don.hbs
    │   │   ├── chi-tiet-don.hbs
    │   │   └── tra-hang.hbs
    │   │
    │   ├── muon-tra/
    │   │   ├── danh-sach-phieu-muon.hbs
    │   │   ├── tao-phieu-muon.hbs
    │   │   ├── chi-tiet-phieu-muon.hbs
    │   │   ├── nhan-tra-sach.hbs
    │   │   ├── danh-sach-dat-truoc.hbs
    │   │   └── sach-qua-han.hbs
    │   │
    │   └── khach-hang/
    │       ├── danh-sach-khach-hang.hbs
    │       ├── chi-tiet-khach-hang.hbs
    │       └── partials/
    │           └── bieu-mau-khach-hang.hbs
    │
    ├── admin/
    │   ├── tong-quan.hbs
    │   ├── chi-nhanh/
    │   ├── nhan-vien/
    │   ├── phan-quyen/
    │   ├── sach/
    │   ├── nha-cung-cap/
    │   ├── kho/
    │   ├── khach-hang/
    │   ├── hoi-vien/
    │   ├── chinh-sach-muon/
    │   ├── thanh-toan/
    │   ├── bao-cao/
    │   └── cai-dat/
    │
    └── super-admin/
        ├── tong-quan.hbs
        ├── don-vi/
        ├── goi-dich-vu/
        ├── dang-ky-dich-vu/
        ├── hoa-don/
        ├── su-dung-ai/
        ├── nhat-ky/
        └── cai-dat/
```

**Quy tắc:** `truong-tien.hbs`, `hop-thoai-xac-nhan.hbs`, `phan-trang.hbs` chỉ có một bản dùng chung. Form thêm/sửa sách cùng dùng `bieu-mau-sach.hbs` và truyền chế độ `tao-moi`/`chinh-sua`; không gộp form sách với form hội viên chỉ vì chúng đều có ô nhập liệu.

### 1.2. `frontend/src/public/` — CSS, JavaScript và tài nguyên trình duyệt

```text
frontend/src/public/
│
├── css/
│   ├── base/
│   │   ├── bien-mau.css
│   │   ├── kieu-chu.css
│   │   ├── dat-lai.css
│   │   └── tien-ich.css
│   │
│   ├── layouts/
│   │   ├── cong-khai.css
│   │   ├── xac-thuc.css
│   │   ├── khach-hang.css
│   │   ├── tong-quan.css
│   │   └── thanh-ben.css
│   │
│   ├── components/
│   │   ├── nut-bam.css
│   │   ├── bieu-mau.css
│   │   ├── bang-du-lieu.css
│   │   ├── hop-thoai.css
│   │   ├── menu-xo-xuong.css
│   │   ├── thong-bao.css
│   │   ├── icon.css
│   │   └── the-sach.css
│   │
│   └── pages/
│       ├── sach.css
│       ├── kho.css
│       ├── ban-hang.css
│       ├── muon-tra.css
│       └── hoi-vien.css
│
├── js/
│   ├── core/
│   │   ├── goi-api.js
│   │   ├── xu-ly-bieu-mau.js
│   │   ├── kiem-tra-bieu-mau.js
│   │   ├── hop-thoai.js
│   │   ├── thong-bao-noi.js
│   │   ├── xac-nhan.js
│   │   ├── bang-du-lieu.js
│   │   ├── phan-trang.js
│   │   ├── tim-kiem.js
│   │   ├── tai-tep-len.js
│   │   ├── xem-truoc-anh.js
│   │   └── quet-ma-vach.js
│   │
│   ├── utils/
│   │   ├── dinh-dang-tien.js
│   │   ├── doc-so-tien.js
│   │   ├── dinh-dang-ngay.js
│   │   ├── chong-goi-lien-tuc.js
│   │   └── tham-so-duong-dan.js
│   │
│   ├── services/
│   │   ├── sach.api.js
│   │   ├── kho.api.js
│   │   ├── khach-hang.api.js
│   │   ├── hoi-vien.api.js
│   │   ├── ban-hang.api.js
│   │   ├── muon-tra.api.js
│   │   └── thanh-toan.api.js
│   │
│   └── modules/
│       ├── sach/
│       │   ├── danh-sach-sach.js
│       │   ├── bieu-mau-sach.js
│       │   ├── bo-suu-tap-anh.js
│       │   └── chi-tiet-sach.js
│       ├── kho/
│       ├── khach-hang/
│       ├── hoi-vien/
│       ├── ban-hang/
│       ├── muon-tra/
│       ├── thanh-toan/
│       └── ai/
│
├── icons/
│   └── bookflow-icons.svg                  # Sản phẩm của script build icon
│
├── brand/
│   ├── bookflow-logo.svg
│   ├── bookflow-symbol.svg
│   └── favicon.svg
│
├── images/                                 # Chỉ ảnh tĩnh do dự án sở hữu
└── fonts/                                  # Chỉ lưu nếu có quyền phân phối
```

Ảnh bìa sách, ảnh minh chứng, ảnh đại diện được upload khi hệ thống chạy **không đặt trong `public/images/`**; lưu file ở MinIO và lưu metadata tại PostgreSQL qua bảng `tep_dinh_kem`.

### 1.3. `frontend/src/assets/` — icon SVG và logo tự thiết kế

```text
frontend/src/assets/
│
├── icons/
│   ├── navigation/
│   │   ├── trang-chu.svg
│   │   ├── tong-quan.svg
│   │   ├── menu.svg
│   │   ├── cai-dat.svg
│   │   └── thong-bao.svg
│   │
│   ├── sach/
│   │   ├── sach.svg
│   │   ├── sach-mo.svg
│   │   ├── gia-sach.svg
│   │   ├── tim-sach.svg
│   │   └── them-sach.svg
│   │
│   ├── nghiep-vu/
│   │   ├── gio-hang.svg
│   │   ├── kho.svg
│   │   ├── muon-sach.svg
│   │   ├── tra-sach.svg
│   │   ├── hoi-vien.svg
│   │   └── thanh-toan.svg
│   │
│   ├── actions/
│   │   ├── them.svg
│   │   ├── sua.svg
│   │   ├── xoa.svg
│   │   ├── tim-kiem.svg
│   │   ├── loc.svg
│   │   ├── tai-xuong.svg
│   │   ├── tai-len.svg
│   │   └── dong.svg
│   │
│   ├── status/
│   │   ├── thanh-cong.svg
│   │   ├── canh-bao.svg
│   │   ├── loi.svg
│   │   └── thong-tin.svg
│   │
│   └── ai/
│       ├── tro-ly-ai.svg
│       ├── tim-kiem-ai.svg
│       └── tao-noi-dung-ai.svg
│
└── brand/
    ├── bookflow-logo.svg
    ├── bookflow-symbol.svg
    ├── bookflow-logo-sang.svg
    ├── bookflow-logo-toi.svg
    └── favicon.svg
```

**Luồng icon:** SVG gốc → `frontend/scripts/build-icons.mjs` → `public/icons/bookflow-icons.svg` → `partials/ui/icon.hbs` → tất cả màn hình. SVG dùng `viewBox`, quy chuẩn nét và `currentColor`; script kiểm tra trùng tên/định dạng. Logo được quản lý riêng, không xem là icon tác vụ. Không chép nguyên SVG vào từng nút/trang.

### 1.4. `frontend/src/` — phần Express render giao diện

```text
frontend/src/
│
├── config/
│   ├── handlebars.js                       # Cấu hình views/layouts/partials theo đường dẫn chuẩn
│   ├── environment.js
│   └── dinh-tuyen.js
│
├── routes/
│   ├── public.route.js
│   ├── auth.route.js
│   ├── customer.route.js
│   ├── staff.route.js
│   ├── admin.route.js
│   └── super-admin.route.js
│
├── controllers/
│   ├── public/
│   ├── auth/
│   ├── customer/
│   ├── staff/
│   ├── admin/
│   └── super-admin/
│
├── services/
│   ├── backend-client.js
│   └── page-data.service.js
│
├── middlewares/
│   ├── tai-nguoi-dung.js
│   ├── yeu-cau-dang-nhap.js
│   ├── kiem-tra-quyen-xem-trang.js
│   └── trang-loi.js
│
└── helpers/
    ├── dinh-dang-tien.js
    ├── dinh-dang-ngay.js
    ├── so-sanh.js
    └── register-helpers.js
```

Frontend chỉ render trang và gửi request tới API nghiệp vụ; không tự truy cập PostgreSQL để sửa đơn hàng, tồn kho hay mượn trả. Các màn hình công khai không yêu cầu đăng nhập; quyền thao tác được xác nhận ở backend.

---

## 2. BACKEND API (BE) — NODE.JS + EXPRESS

### 2.1. `backend/src/`

```text
backend/src/
│
├── server.js
├── app.js
├── worker.js
│
├── config/
│   ├── environment.js
│   ├── cors.js                             # Tên chuẩn kỹ thuật CORS
│   ├── session.js
│   └── security.js
│
├── common/
│   ├── errors/
│   │   ├── AppError.js
│   │   └── error-codes.js
│   │
│   ├── middlewares/
│   │   ├── xac-thuc.js
│   │   ├── phan-quyen.js
│   │   ├── pham-vi-don-vi.js
│   │   ├── pham-vi-chi-nhanh.js
│   │   ├── kiem-tra-du-lieu.js
│   │   ├── xu-ly-loi.js
│   │   └── gioi-han-tan-suat.js
│   │
│   ├── validators/
│   │   ├── dung-chung.schema.js
│   │   ├── phan-trang.schema.js
│   │   ├── ngay.schema.js
│   │   └── tien.schema.js
│   │
│   ├── responses/
│   │   └── api-response.js
│   │
│   └── utils/
│       ├── phan-trang.js
│       ├── tien.js
│       ├── ngay.js
│       └── tao-ma.js
│
├── database/
│   ├── pool.js
│   ├── query.js
│   └── transaction.js
│
├── integrations/
│   ├── ai-client.js
│   ├── redis-client.js
│   ├── storage-client.js
│   ├── email-client.js
│   └── payment-provider.js
│
├── jobs/
│   ├── queues/
│   ├── processors/
│   └── schedules/
│
├── modules/
│   ├── auth/
│   ├── tai-khoan/
│   ├── don-vi/
│   ├── chi-nhanh/
│   ├── phan-quyen/
│   ├── sach/
│   ├── nha-cung-cap/
│   ├── kho/
│   ├── khach-hang/
│   ├── hoi-vien/
│   ├── gio-hang/
│   ├── ban-hang/
│   ├── muon-tra/
│   ├── thanh-toan/
│   ├── bao-cao/
│   ├── thong-bao/
│   ├── tep-dinh-kem/
│   ├── ai/
│   ├── saas/                               # Tên mô hình kỹ thuật SaaS
│   ├── cai-dat/
│   └── nhat-ky/
│
└── routes/
    └── index.js                            # Điểm đăng ký route chung
```

`common/` chỉ chứa hạ tầng/lỗi/validation/tiện ích thực sự được tái sử dụng. Không đưa toàn bộ quy tắc nghiệp vụ vào một file chung khổng lồ. `database/transaction.js` tạo transaction thống nhất cho những thao tác cần nguyên tử.

### 2.2. `backend/src/modules/sach/` — ví dụ module sách

```text
backend/src/modules/sach/
│
├── sach.route.js
├── sach.controller.js
├── sach.service.js
├── sach.repository.js
├── sach.validation.js
├── sach.permission.js
├── sach.mapper.js
├── sach.constant.js
│
├── phien-ban/
│   ├── phien-ban.route.js
│   ├── phien-ban.controller.js
│   ├── phien-ban.service.js
│   └── phien-ban.repository.js
│
├── media/
│   ├── hinh-anh-sach.controller.js
│   └── hinh-anh-sach.service.js
│
└── tests/
    ├── sach.service.test.js
    └── sach.controller.test.js
```

`hinh-anh-sach.service.js` chỉ quản lý quan hệ giữa sách và ảnh. Để upload, quét/kiểm tra file và ghi metadata, nó gọi `modules/tep-dinh-kem/`; không xây thêm một bộ upload riêng cho mỗi module.

### 2.3. `backend/src/modules/tep-dinh-kem/` — upload dùng chung

```text
backend/src/modules/tep-dinh-kem/
│
├── tep.route.js
├── tep.controller.js
├── tep.service.js
├── tep.repository.js
├── tep.validation.js
├── tep.permission.js
│
├── processors/
│   ├── xu-ly-hinh-anh.js
│   └── doc-thong-tin-tep.js
│
└── tests/
    └── tep.service.test.js
```

Module dùng cho ảnh bìa, ảnh đại diện, ảnh minh chứng và chứng từ; kiểm tra quyền riêng cho từng bản ghi, không mặc định file upload nào cũng công khai. Backend chịu trách nhiệm xác thực, phân quyền, thanh toán, cập nhật tồn kho, giao dịch mượn/trả; AI không được tự ghi các nghiệp vụ này.

---

## 3. AI SERVICE — PYTHON + FASTAPI + WORKER

### 3.1. `ai-service/app/`

> Python dùng **`snake_case`** cho tên module được import. Ví dụ `app.services.tu_van_sach`; không đặt `tu-van-sach.py` vì cú pháp `import` thông thường sẽ không hoạt động. Dockerfile API trỏ tới `app.main:app`.

```text
ai-service/app/
│
├── __init__.py
├── main.py                                 # Tạo ứng dụng FastAPI
├── config.py
│
├── api/
│   ├── __init__.py
│   ├── tro_chuyen.py
│   ├── sach.py
│   ├── bao_cao.py
│   ├── lap_chi_muc.py
│   └── tac_vu.py
│
├── core/
│   ├── __init__.py
│   ├── dependencies.py
│   ├── security.py
│   ├── exceptions.py
│   └── logging.py
│
├── schemas/
│   ├── __init__.py
│   ├── tro_chuyen.py
│   ├── sach.py
│   ├── bao_cao.py
│   └── tac_vu.py
│
├── llm/
│   ├── __init__.py
│   ├── client.py
│   ├── provider.py
│   └── response_parser.py
│
├── embeddings/
│   ├── __init__.py
│   ├── embedding_service.py
│   └── indexing_service.py
│
├── retrieval/
│   ├── __init__.py
│   ├── vector_search.py
│   ├── keyword_search.py
│   └── permission_filter.py
│
├── services/
│   ├── __init__.py
│   ├── tu_van_sach.py
│   ├── phan_loai_sach.py
│   ├── phan_tich_bao_cao.py
│   └── quan_ly_hoi_thoai.py
│
├── repositories/
│   ├── __init__.py
│   ├── vector.py
│   ├── hoi_thoai.py
│   └── tac_vu_ai.py
│
├── prompts/
│   ├── tu_van_sach.txt
│   ├── phan_loai_sach.txt
│   └── phan_tich_bao_cao.txt
│
├── workers/
│   ├── __init__.py
│   ├── worker.py
│   ├── queue.py
│   └── tasks/
│       ├── __init__.py
│       ├── lap_chi_muc_sach.py
│       ├── phan_loai_sach.py
│       └── phan_tich_bao_cao.py
│
└── utils/
    ├── __init__.py
    ├── van_ban.py
    └── dinh_danh.py
```

**Hai container Python riêng:** `ai-api` chạy FastAPI; `ai-worker` chạy RQ worker. Cả hai import cùng `services/`, `embeddings/`, `retrieval/`, `llm/`. Nếu đổi mã dùng chung, build lại cả hai image. BullMQ (Node.js) và RQ (Python) có queue riêng, dù có thể cùng dùng Redis; Node yêu cầu tạo job AI qua API nội bộ FastAPI, không tự đẩy trực tiếp job BullMQ vào RQ.

---

## 4. DATABASE — POSTGRESQL + PGVECTOR

```text
database/
│
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
│
├── seeds/
│   ├── quyen.sql
│   ├── vai_tro_mac_dinh.sql
│   ├── cau_hinh_he_thong.sql
│   └── du_lieu_demo.sql
│
├── scripts/
│   ├── migrate.js
│   ├── seed.js
│   └── check-migrations.js
│
├── tests/
│   ├── constraints/
│   └── giao-dich/
│
├── package.json
├── package-lock.json
├── Dockerfile.migrate
└── README.md
```

Tên file migration là **dự kiến**, không phải SQL đã được viết/kiểm thử. Thứ tự cuối cùng phải theo quan hệ khóa ngoại thực tế; các FK vòng phụ thuộc có thể được tạo sau. `tep_dinh_kem` tạo trước `dau_sach` vì `anh_bia_chinh_id` tham chiếu file. Mỗi migration cần được ghi nhận lịch sử, không tự chạy lại tùy tiện trên production.

---

## 5. CONTRACTS — DÙNG CHUNG GIỮA CÁC ỨNG DỤNG

```text
contracts/
│
├── openapi/
│   ├── bookflow-api.yaml
│   └── ai-noi-bo-api.yaml
│
├── schemas/
│   ├── sach.schema.json
│   ├── khach-hang.schema.json
│   ├── tac-vu-ai.schema.json
│   └── loi-api.schema.json
│
├── examples/
│   ├── sach.response.json
│   ├── tao-don-hang.request.json
│   └── tim-kiem-ai.response.json
│
└── README.md
```

Đây là **hợp đồng dữ liệu**, không phải code nghiệp vụ dùng chung: frontend không import service của backend; backend không import trực tiếp module Python. Mọi thay đổi không tương thích cần có phiên bản hoặc quy trình triển khai phối hợp.

---

## 6. INFRASTRUCTURE — NGINX, POSTGRESQL, REDIS, MINIO

```text
infrastructure/
│
├── nginx/
│   ├── nginx.conf
│   ├── templates/
│   │   ├── phat-trien.conf.template
│   │   └── san-xuat.conf.template
│   └── README.md
│
├── postgres/
│   ├── init/
│   └── README.md
│
├── redis/
│   ├── redis.conf
│   └── README.md
│
├── minio/
│   ├── policies/
│   └── README.md
│
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   └── canh-bao/
│
├── backup/
│   ├── postgres/
│   ├── minio/
│   └── restore/
│
└── scripts/
    ├── check-health.sh
    └── verify-backup.sh
```

Cấu hình hạ tầng được commit Git; mật khẩu, API key và khóa MinIO không được commit. PostgreSQL/Redis/MinIO/FastAPI chỉ mở trong mạng nội bộ; trên production, Nginx là điểm truy cập công khai. Volume lưu dữ liệu PostgreSQL/MinIO nằm ngoài source code và có kế hoạch sao lưu/khôi phục riêng.

### 6.1. File Docker Compose ở thư mục gốc

```text
BookFlow/
├── compose.yaml
├── compose.dev.yaml
├── compose.stable.yaml
└── compose.production.yaml
```

| File | Mục đích |
|---|---|
| `compose.yaml` | Khai báo service, network, volume, healthcheck và cấu hình chung. |
| `compose.dev.yaml` | Build từ source, mount mã nguồn, hot reload và cổng debug cục bộ. |
| `compose.stable.yaml` | Dùng image đã build để kiểm thử bản phát hành. |
| `compose.production.yaml` | Dùng image gắn phiên bản đã kiểm thử, hạn chế cổng công khai, cấu hình tài nguyên và bảo mật. |

**Service dự kiến:** `nginx`, `frontend`, `backend`, `backend-worker`, `ai-api`, `ai-worker`, `postgres`, `redis`, `minio`. `backend-worker` dùng image của `backend` và chỉ đổi command khởi chạy. Migration chạy theo job riêng khi triển khai, không tự khởi chạy từ mọi service.

---

## 7. SCRIPTS — BUILD CHUNG, BUILD RIÊNG, TRIỂN KHAI

```text
scripts/
│
├── build/
│   ├── build-all.sh
│   ├── build-frontend.sh
│   ├── build-backend.sh
│   ├── build-ai-api.sh
│   └── build-ai-worker.sh
│
├── deploy/
│   ├── deploy-dev.sh
│   ├── deploy-stable.sh
│   ├── deploy-production.sh
│   └── deploy-service.sh
│
├── database/
│   ├── migrate.sh
│   └── seed.sh
│
└── backup/
    ├── backup-database.sh
    └── restore-database.sh
```

```text
.github/workflows/
│
├── test-frontend.yml
├── test-backend.yml
├── test-ai.yml
├── test-contracts.yml
├── build-images.yml
├── deploy-stable.yml
└── deploy-production.yml
```

`package.json` ở gốc làm bộ điều phối lệnh. Ví dụ tên script: `build`, `build:frontend`, `build:backend`, `build:ai-api`, `build:ai-worker`, `build:ai`, `dev`, `stable`, `production`. Tên script là chuỗi tự đặt, có thể dùng tiếng Việt không dấu. Nếu chỉ đổi giao diện thì build `frontend`; sửa mã Python dùng chung thì build cả `ai-api` và `ai-worker`; thay đổi hợp đồng hoặc database phải chạy kiểm thử tương thích trước khi deploy.

---

## 8. DOCS — TÀI LIỆU DỰ ÁN

```text
docs/
│
├── architecture/
│   ├── tong-quan.md
│   ├── luong-yeu-cau.md
│   ├── ranh-gioi-phan-he.md
│   └── kien-truc-trien-khai.md
│
├── database/
│   ├── tu-dien-du-lieu.md
│   ├── quan-he-cac-bang.md
│   ├── thu-tu-migration.md
│   └── quy-tac-du-lieu.md
│
├── api/
│   ├── quy-uoc-api.md
│   └── xac-thuc.md
│
├── ai/
│   ├── kien-truc-ai.md
│   ├── luong-lap-chi-muc.md
│   ├── quy-uoc-mau-lenh.md
│   └── phan-quyen-ai.md
│
├── frontend/
│   ├── he-thong-thiet-ke.md
│   ├── quy-uoc-icon.md
│   ├── quy-uoc-bieu-mau.md
│   └── danh-sach-trang.md
│
├── deployment/
│   ├── phat-trien.md
│   ├── on-dinh.md
│   ├── san-xuat.md
│   └── sao-luu-khoi-phuc.md
│
└── business/
    ├── ban-hang.md
    ├── kho.md
    ├── muon-tra.md
    ├── hoi-vien.md
    └── saas.md
```

Bộ từ điển dữ liệu chi tiết đã thiết kế trước đó sẽ là nội dung nguồn của `docs/database/tu-dien-du-lieu.md`. Đặc tả OpenAPI chuẩn chỉ có một nguồn trong `contracts/openapi/`; `docs/api/` chỉ giải thích quy ước, không duy trì thêm một bản đặc tả API khác.

---

# PHẦN III. NGUYÊN TẮC CHỐNG LẶP VÀ TRIỂN KHAI

| Vấn đề | Quy tắc BookFlow |
|---|---|
| Form | Dùng chung từng field và xử lý nền; mỗi nghiệp vụ có form riêng, dùng chung cho thêm/sửa khi phù hợp. |
| Modal, bảng, phân trang | Một bộ partials, CSS và JS lõi; từng trang khai báo dữ liệu và quyền riêng. |
| Icon và logo | SVG tự vẽ, có quy chuẩn và một bước build tạo sprite; không chép SVG vào từng trang. |
| Frontend ↔ backend | Giao tiếp qua API; frontend không import hoặc tái tạo service nghiệp vụ. |
| Phân quyền SaaS | Backend xác thực cuối cùng; kiểm tra đơn vị, chi nhánh và quyền theo từng request. |
| Upload | Một module file dùng chung quản lý MinIO và metadata; module sách/khách hàng chỉ tạo liên kết. |
| AI | Python xử lý gợi ý/tìm kiếm/phân loại; Node.js nắm quyền quyết định bán, kho, mượn trả và thanh toán. |
| Queue | BullMQ Node.js và RQ Python có queue riêng; giao tiếp qua API nội bộ. |
| Database | Một chuỗi migration có lịch sử; giao dịch tiền/tồn kho phải nhất quán và có kiểm thử đồng thời. |
| Build | Mỗi ứng dụng có Dockerfile/dependency riêng; code và hợp đồng chung phải được kiểm thử khi thay đổi. |
| Production | Chỉ công khai Nginx; cấu hình riêng, image có phiên bản, HTTPS, backup và thử khôi phục. |


## Những tên cố ý giữ tiếng Anh

`frontend/`, `backend/`, `ai-service/`, `database/`, `contracts/`, `infrastructure/`, `scripts/`, `docs/`, `src/`, `app/`, `views/`, `layouts/`, `partials/`, `components/`, `pages/`, `public/`, `assets/`, `config/`, `routes/`, `controllers/`, `services/`, `middlewares/`, `helpers/`, `modules/`, `common/`, `database/`, `integrations/`, `jobs/`, `repositories/`, `schemas/`, `llm/`, `embeddings/`, `retrieval/`, `prompts/`, `workers/`, `migrations/`, `seeds/`, `tests/`, `openapi/`, `nginx/`, `redis/`, `postgres/`, `minio/`, `.github/workflows/`, `Dockerfile*`, `package.json`, `requirements.txt`, `compose.*.yaml`, `.env.example` và `README.md` là tên kỹ thuật hoặc tên theo quy ước công cụ.

**Trạng thái:** tài liệu mô tả cấu trúc dự kiến; chưa tạo các ứng dụng, icon, logo, migration hay Dockerfile thực tế.
