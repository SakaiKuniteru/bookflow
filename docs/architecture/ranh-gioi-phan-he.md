# Ranh giới phân hệ BookFlow AI

**Trạng thái:** quy ước thiết kế tại F00.1; các module và API chưa được triển khai.

## 1. Phân công trách nhiệm

| Phần | Được làm | Không được làm |
|---|---|---|
| Frontend | Render Handlebars, dùng form/component/icon chung, gọi API, hiển thị lỗi và trạng thái | Tự quyết định quyền, tự sửa dữ liệu PostgreSQL, tự đánh dấu thanh toán thành công |
| Backend API | Xác thực, phân quyền, quản lý tenant/branch, kiểm tra đầu vào, điều phối nghiệp vụ, ghi transaction | Tin quyền do frontend khai báo; để AI tự phê duyệt nghiệp vụ |
| Backend Worker | Chạy BullMQ cho thông báo/email/nhắc hạn, xử lý retry có kiểm soát | Tạo giao dịch trùng khi chạy lại job |
| FastAPI AI | Xác thực yêu cầu nội bộ, lập lịch job AI, tư vấn/tìm kiếm và trả kết quả theo hợp đồng | Tự sửa tồn kho, thu tiền, xác nhận bàn giao |
| AI Worker | Tạo embedding, cập nhật chỉ mục vector, phân loại và phân tích AI | Đọc dữ liệu ngoài quyền hoặc tự đổi trạng thái chứng từ nghiệp vụ |
| Database | Ràng buộc, transaction, lưu dữ liệu chuẩn và lịch sử migration | Tự thay đổi schema từ lúc khởi động từng replica |
| MinIO | Lưu file/ảnh và trả object theo chính sách | Tự quyết định người được phép xem file |
| Contracts | Định nghĩa request, response, mã lỗi và schema | Chứa service nghiệp vụ dùng chung giữa Node.js và Python |

## 2. Ranh giới giữa các module backend

- `sach/`: đầu sách, phiên bản, metadata và liên kết ảnh; upload file do module `tep/` thực hiện.
- `kho/`: tồn bán, bản sao sách, nhập/chuyển kho và biến động; `ban-hang/` hoặc `muon-tra/` gọi qua service kho.
- `thanh-toan/`: khoản phải thu, thu/hoàn/cọc; các phân hệ khác không tự ghi sổ giao dịch.
- `muon-tra/`: đặt trước, bàn giao, gia hạn và trả từng cuốn; kiểm tra hạn mức hội viên qua module sở hữu quyền lợi.
- `phan-quyen/` và middleware dùng chung: quyền thao tác, tenant scope và branch scope; kiểm tra tại API kể cả khi FE đã ẩn nút.
- `tep/`: kiểm tra loại/kích thước/quyền truy cập và metadata file; nội dung lưu tại MinIO.

## 3. Queue và quyền truy cập

Backend dùng BullMQ; Python dùng RQ. Cả hai có thể dùng Redis nhưng **không đọc trực tiếp job của nhau**. Backend tạo yêu cầu AI thông qua FastAPI nội bộ.

Mỗi yêu cầu AI chỉ được nhận dữ liệu đã được backend cho phép trong phạm vi tenant và quyền phù hợp. Khi AI không khả dụng, các chức năng nghiệp vụ lõi vẫn hoạt động.

## 4. Chia sẻ code

Chỉ chia sẻ hợp đồng trong `contracts/`. Trong từng ứng dụng, đặt hàm thực sự dùng chung vào `common/`, `core/`, `utils/`, hoặc các partial/component. Không import service của backend trực tiếp từ frontend và không đưa quy tắc bán/mượn/tiền sang Python.

[Tổng quan kiến trúc](tong-quan.md) · [Từ điển dữ liệu](../database/tu-dien-du-lieu.md)
