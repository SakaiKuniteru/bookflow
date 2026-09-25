# MinIO của BookFlow

MinIO lưu nội dung ảnh và file. PostgreSQL lưu metadata,
liên kết tới nghiệp vụ và quyền truy cập.

## Development

- S3 API: `http://127.0.0.1:19000`
- Console: `http://127.0.0.1:19001`
- Trong mạng Docker: `http://minio:9000`
- Dữ liệu lưu trong volume `minio_data`.

Tài khoản quản trị lấy từ `.env` cục bộ.

Không đưa MinIO Console, tài khoản quản trị hoặc bucket
private ra Internet. Ở các bước tiếp theo, backend sẽ dùng
tài khoản dịch vụ có quyền tối thiểu thay cho tài khoản root.

F02 chưa tự tạo bucket nghiệp vụ và chưa thực hiện upload
thông qua backend.