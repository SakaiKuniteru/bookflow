# Tổng quan kiến trúc BookFlow AI

**Trạng thái:** kiến trúc dự kiến tại F00.1; chưa có service hoặc Docker Compose chạy thật.

## 1. Thành phần

| Folder | Công nghệ | Trách nhiệm |
|---|---|---|
| `frontend/` | Express, Handlebars, Bootstrap, JavaScript | Render giao diện và gọi Backend API |
| `backend/` | Node.js, Express | Xác thực, phân quyền, bán sách, kho, mượn/trả, hội viên, thanh toán |
| `ai-service/` | Python, FastAPI | Tiếp nhận yêu cầu AI từ backend |
| `ai-service/` — worker | Python, RQ | Embedding, phân loại và tác vụ AI chạy nền |
| `database/` | PostgreSQL, pgvector | Migration và dữ liệu khởi tạo |
| `infrastructure/` | Nginx, Redis, MinIO | Điều hướng HTTP, hàng đợi/cache, object storage |
| `contracts/` | OpenAPI, JSON Schema | Hợp đồng giao tiếp giữa ứng dụng |

## 2. Luồng yêu cầu

```text
Trình duyệt
    |
    v
  Nginx
    |------------------------|
    v                        v
Frontend SSR           Backend API
    |                        |
    |---- gọi API ---------->|
                             |--------> PostgreSQL + pgvector
                             |--------> Redis
                             |--------> MinIO
                             |
                             v
                         FastAPI AI
                             |
                             v
                         Redis (RQ)
                             |
                             v
                         AI Worker
```

Backend là nguồn quyết định nghiệp vụ. Frontend có thể render theo thông tin quyền được trả về, nhưng backend vẫn kiểm tra mọi thao tác. AI chỉ tư vấn, tìm kiếm hoặc đề xuất; AI không được tự xác nhận giao dịch hay sửa tồn kho.

## 3. Build và triển khai dự kiến

Bốn image ứng dụng: `frontend`, `backend`, `ai-api`, `ai-worker`. Worker BullMQ Node.js sử dụng image `backend` với command khởi động riêng.

Mỗi ứng dụng có dependency và Dockerfile riêng. Nginx là cổng công khai trên Production; PostgreSQL, Redis, MinIO và FastAPI chỉ truy cập qua mạng nội bộ theo cấu hình.

F00.1 chỉ cung cấp script kiểm tra cấu trúc. Build image, chạy Compose, migration, healthcheck và API sẽ được bổ sung khi viết code ở các bước kế tiếp.

## 4. Nguyên tắc dữ liệu

PostgreSQL là nguồn dữ liệu giao dịch. Redis phục vụ cache và queue. MinIO lưu nội dung file, PostgreSQL lưu metadata và quyền. Với SaaS, backend phải kiểm tra phạm vi `don_vi_id` và `chi_nhanh_id` ở mỗi thao tác liên quan.

[Tài liệu ranh giới phân hệ](ranh-gioi-phan-he.md) · [Từ điển dữ liệu](../database/tu-dien-du-lieu.md)
