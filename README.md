# BookFlow AI

BookFlow AI là hệ thống quản lý sách theo mô hình nhiều đơn vị và chi nhánh, hỗ trợ danh mục sách, bán hàng, mượn miễn phí, thuê có phí, hội viên và các chức năng AI. Đây là **bộ khung F00.1**, chưa có ứng dụng nghiệp vụ, API, Dockerfile hay migration thực tế.

## Kiến trúc dự kiến

| Thành phần | Công nghệ | Nhiệm vụ |
|---|---|---|
| `frontend/` | Node.js, Express, Handlebars, Bootstrap, JavaScript | Render giao diện công khai, khách hàng, nhân viên và quản trị |
| `backend/` | Node.js, Express | API nghiệp vụ, xác thực, phân quyền, giao dịch |
| `ai-service/` — API | Python, FastAPI | API AI nội bộ do backend gọi |
| `ai-service/` — Worker | Python, RQ | Xử lý tác vụ AI nền |
| `database/` | PostgreSQL, pgvector | Migration, dữ liệu khởi tạo |
| `infrastructure/` | Nginx, Redis, MinIO | Reverse proxy, hàng đợi/cache, lưu file |

Bốn image ứng dụng dự kiến là `frontend`, `backend`, `ai-api`, `ai-worker`. `backend-worker` chạy từ image `backend` với lệnh khác, không phải image thứ năm.

Luồng dự kiến: trình duyệt → Nginx → frontend/backend; backend → PostgreSQL/Redis/MinIO và gọi FastAPI nội bộ khi cần. Worker Python xử lý tác vụ AI qua queue Python độc lập với BullMQ của Node.js.

## Chạy bộ khung F00.1

Yêu cầu: Node.js 20 trở lên. F00.1 dùng các module có sẵn của Node.js; **không cần `npm install`**.

```bash
npm run kiem-tra:nen-tang
```

Các lệnh trên chỉ kiểm tra bộ khung. `build`, `dev`, `migrate`, Docker Compose và API sẽ được bổ sung ở các bước tiếp theo **sau khi script tương ứng được viết**.

## Tài liệu

- [Tổng quan kiến trúc](docs/architecture/tong-quan.md)
- [Ranh giới phân hệ](docs/architecture/ranh-gioi-phan-he.md)
- [Từ điển dữ liệu đã duyệt](docs/database/tu-dien-du-lieu.md)
- [Bản gốc để đối chiếu](docs/database/ban-goc/BookFlow_AI_Tu_Dien_Du_Lieu_Chi_Tiet.md)

## Quy ước đặt tên

Giữ tiếng Anh cho lớp kỹ thuật (`frontend`, `backend`, `database`, `routes`, `services`, `Dockerfile`...). Tên nghiệp vụ dùng tiếng Việt không dấu: JavaScript/Handlebars/CSS/SVG dùng `kebab-case`; module Python dùng `snake_case`; bảng/cột PostgreSQL dùng `snake_case`.

## Git và bảo mật

- `main`: phiên bản ổn định. `dev`: nhánh phát triển. Không commit trực tiếp lên `main`.
- Không commit `.env`, mật khẩu, token, khóa API, private key, dữ liệu khách hàng, bản dump hoặc file upload thật.
- `.env.example` chỉ mô tả tên biến và giá trị mẫu; không phải cấu hình Production.
- Sau mỗi lần sửa: kiểm tra `git diff --check`, `git diff --stat`, `git diff` và `git status --short` trước khi commit.
- F00.1 không tự kết nối hoặc đẩy code lên GitHub.
