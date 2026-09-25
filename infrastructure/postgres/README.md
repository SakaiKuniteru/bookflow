# PostgreSQL của BookFlow

- Development dùng PostgreSQL 17 và pgvector 0.8.6.
- Database mặc định: `bookflow_dev`.
- Kết nối từ máy Mac qua `127.0.0.1:15432`.
- Kết nối từ các container khác qua `postgres:5432`.
- Dữ liệu được lưu trong Docker volume `postgres_data`.
- Không chạy SQL migration bằng thư mục init tự động.
- Migration do `database/scripts/migrate.js` quản lý ở F03.
- Không sử dụng lệnh `docker compose down -v` với dữ liệu cần giữ.

Extension `vector` chỉ được kích hoạt trong database khi chạy
migration `001_extensions.sql`.