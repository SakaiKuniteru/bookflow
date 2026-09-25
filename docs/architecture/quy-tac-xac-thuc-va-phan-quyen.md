# BookFlow — Quy tắc xác thực, tài khoản và phân quyền F05

## 1. Nguyên tắc chung

BookFlow sử dụng một bảng `tai_khoan` làm danh tính đăng nhập chung cho toàn nền tảng.

Một tài khoản có thể:
- Chỉ là người dùng thông thường.
- Là nhân viên hoặc quản lý của một hay nhiều đơn vị.
- Đồng thời là người dùng thông thường và nhân viên/quản lý.

Không phân loại cố định tài khoản bằng một trường như `loai_tai_khoan = NHAN_VIEN`.
Tư cách nhân viên được xác định bằng quan hệ thành viên đang có hiệu lực trong
`thanh_vien_don_vi`, không phải bằng loại tài khoản tự khai báo.

Người dùng thông thường không bắt buộc thuộc đơn vị hoặc chi nhánh nào.

Đơn vị, chi nhánh và vai trò nội bộ chỉ xác định phạm vi làm việc của nhân viên,
quản lý và những tài khoản được cấp quyền quản trị hợp lệ.

## 2. Tài khoản người dùng thông thường

Người dùng được đăng ký tài khoản bằng thông tin cá nhân, email và mật khẩu.

Quy trình đăng ký:
1. Backend kiểm tra dữ liệu đăng ký và email trùng.
2. Mật khẩu được băm bằng thuật toán chuyên dụng.
3. Tạo bản ghi `tai_khoan` ở trạng thái `CHO_XAC_MINH`.
4. Tạo OTP có mục đích `DANG_KY` trong bảng `ma_xac_minh`.
5. Gửi OTP tới email đăng ký.
6. Khi OTP hợp lệ, đánh dấu `email_da_xac_minh = TRUE` và chuyển tài khoản
   sang `DANG_DUNG` theo chính sách kích hoạt.

Đăng ký tài khoản thông thường KHÔNG tự động:
- Tạo `don_vi` hoặc `chi_nhanh`.
- Tạo bản ghi `thanh_vien_don_vi` hoặc `thanh_vien_chi_nhanh`.
- Gán vai trò `QUAN_TRI`, `NHAN_VIEN` hoặc `THU_THU`.
- Cấp quyền truy cập API quản trị.

Người dùng có thể xem các nội dung công khai mà không cần đăng nhập.

Các chức năng gắn với dữ liệu cá nhân như xem hồ sơ, đơn hàng, lịch sử mượn
hoặc đổi mật khẩu phải xác thực tài khoản theo quy định của từng API.

## 3. Tài khoản nhân viên và quản lý

Nhân viên và quản lý vẫn dùng bảng `tai_khoan` và cùng cơ chế đăng nhập.

Một tài khoản chỉ trở thành nhân viên của đơn vị khi có bản ghi hợp lệ trong
`thanh_vien_don_vi`. Bản ghi này phải được tạo qua quy trình phân công hoặc
mời thành viên do người có quyền thực hiện.

Nếu tài khoản đã tồn tại, quy trình mời sử dụng lại tài khoản đó; không tạo
thêm một tài khoản đăng nhập chỉ vì người đó làm việc ở đơn vị khác.

`thanh_vien_don_vi` xác định tài khoản được làm việc tại đơn vị nào.

`thanh_vien_chi_nhanh` xác định nhân viên được phân công vào những chi nhánh
nào thuộc đơn vị đó.

`thanh_vien_vai_tro` xác định vai trò được cấp cho thành viên, có thể áp dụng
trong toàn đơn vị hoặc giới hạn tại một chi nhánh.

Một tài khoản có thể làm việc tại nhiều đơn vị và nhiều chi nhánh, nhưng
quyền của từng đơn vị được quản lý độc lập.

Không được tự gia nhập đơn vị, tự phân công chi nhánh hoặc tự cấp vai trò
bằng cách gửi ID tùy ý từ frontend.

## 4. Tạo đơn vị và quản trị viên đầu tiên

Đăng ký tài khoản thông thường không đồng nghĩa với quyền tạo đơn vị.

Việc tạo đơn vị phải thông qua một quy trình khởi tạo được hệ thống cho phép.
Quy trình này phải xác định và xác minh tài khoản được quyền tạo đơn vị.

Trong cùng một transaction, backend thực hiện:
1. Tạo `don_vi`.
2. Tạo quan hệ `thanh_vien_don_vi` cho tài khoản khởi tạo.
3. Tạo hoặc liên kết vai trò quản trị hệ thống của đơn vị.
4. Gán vai trò quản trị ban đầu cho đúng thành viên khởi tạo.
5. Ghi nhật ký thao tác.

Nếu một bước thất bại, toàn bộ transaction phải rollback.

Không tạo tài khoản quản trị mặc định bằng mật khẩu cố định.
Không nhận vai trò quản trị do client tự gửi trong request đăng ký.

## 5. Phiên đăng nhập và ngữ cảnh làm việc

Sau khi xác thực thành công, backend tạo phiên đăng nhập cho tài khoản.

Phiên đăng nhập có thể không có đơn vị hoặc chi nhánh đang chọn.
Đây là trạng thái bình thường đối với tài khoản người dùng thông thường.

Các trường:
- `phien_dang_nhap.don_vi_dang_chon_id`
- `phien_dang_nhap.chi_nhanh_dang_chon_id`

chỉ lưu NGỮ CẢNH LÀM VIỆC NỘI BỘ đã được backend xác minh.

Đối với tài khoản có quyền nhân viên, backend trả danh sách đơn vị mà tài
khoản có tư cách thành viên hợp lệ. Người dùng có thể đề nghị chọn một đơn vị
và chi nhánh trong danh sách được cấp.

Trước khi lưu ngữ cảnh, backend phải xác minh:
- Phiên và tài khoản còn hợp lệ.
- Thành viên thuộc đúng đơn vị và đang được phép làm việc.
- Chi nhánh thuộc đúng đơn vị.
- Phân công chi nhánh còn hiệu lực nếu thao tác yêu cầu phân công.
- Vai trò và quyền đáp ứng yêu cầu của thao tác.

Khi chuyển đơn vị, phải xóa ngữ cảnh chi nhánh cũ trước khi chọn chi nhánh
mới. Không mang quyền hoặc phạm vi của đơn vị trước sang đơn vị sau.

Client có thể đề nghị chọn ID, nhưng ID do client gửi KHÔNG phải bằng chứng
có quyền. Mỗi request quản trị vẫn phải kiểm tra lại quyền hiện hành.

## 6. Phân biệt chi nhánh làm việc và chi nhánh người dùng đang xem

Người dùng thông thường có thể xem một nhà sách, thư viện hoặc chi nhánh,
chọn nơi nhận sách hoặc chọn chi nhánh để sử dụng dịch vụ.

Những lựa chọn đó là NGỮ CẢNH NGHIỆP VỤ CỦA NGƯỜI DÙNG, không phải phạm vi
phân quyền nhân viên.

Ví dụ: người dùng chọn chi nhánh A để nhận sách không có nghĩa là người đó
là nhân viên chi nhánh A hoặc được quyền quản lý dữ liệu của chi nhánh A.

Các API phục vụ người dùng phải xác minh quyền sở hữu dữ liệu cá nhân.
Đối với tài nguyên thuộc một đơn vị hoặc chi nhánh, backend xác định đơn vị
và chi nhánh từ dữ liệu tài nguyên trong database, không tin ID tùy ý trong
request để vượt qua kiểm tra quyền.

Không lưu chi nhánh người dùng đang xem vào
`phien_dang_nhap.chi_nhanh_dang_chon_id` như một phạm vi nhân viên.

## 7. Quy tắc RBAC nội bộ

RBAC nội bộ áp dụng cho thành viên của đơn vị, không áp dụng mặc định cho
mọi tài khoản người dùng.

Các bảng:
- `vai_tro`: vai trò thuộc từng đơn vị.
- `quyen`: danh mục mã quyền dùng chung toàn nền tảng.
- `vai_tro_quyen`: quyền được cấp cho vai trò và phạm vi tương ứng.
- `thanh_vien_vai_tro`: vai trò được gán cho thành viên, có thể giới hạn
  tại một chi nhánh.

Một quyền chỉ có hiệu lực khi đồng thời đáp ứng:
1. Tài khoản và phiên hợp lệ.
2. Đơn vị đang hoạt động.
3. Tư cách thành viên tại đơn vị đang có hiệu lực.
4. Vai trò đang hoạt động và thời hạn gán vai trò còn hiệu lực.
5. Quyền đang hoạt động và có phạm vi phù hợp.
6. Chi nhánh đích thuộc đúng đơn vị và nằm trong phạm vi được phép nếu
   thao tác yêu cầu quyền chi nhánh.

Phạm vi `DON_VI` cho phép thao tác trong đơn vị theo mã quyền được cấp.

Phạm vi `CHI_NHANH` chỉ cho phép thao tác tại chi nhánh hợp lệ mà thành viên
được phân công hoặc được quản lý theo vai trò đã xác minh.

Phạm vi `CA_NHAN` chỉ cho phép thao tác trên tài nguyên cá nhân mà backend
đã xác minh thuộc người thực hiện.

Vai trò được gán tại một chi nhánh không tự trở thành vai trò toàn đơn vị.
Quyền của đơn vị A không có hiệu lực tại đơn vị B.

Không tìm thấy quyền hợp lệ thì mặc định từ chối.

## 8. Quyền thay đổi và thu hồi quyền

Backend kiểm tra quyền hiện hành trên mỗi request quản trị.

Trong F05, không lưu danh sách quyền cố định vào cookie hoặc token để sử dụng
mãi đến khi phiên hết hạn. Không cache quyết định phân quyền qua nhiều
request khi chưa có cơ chế vô hiệu hóa cache rõ ràng.

Khi thành viên bị khóa, nghỉ việc, kết thúc phân công chi nhánh hoặc bị
thu hồi vai trò, các request tiếp theo phải áp dụng trạng thái mới.

Thay đổi mật khẩu hoặc đặt lại mật khẩu phải cập nhật phiên bản xác thực để
vô hiệu hóa phiên cũ theo chính sách bảo mật.

Thao tác cấp, thay đổi hoặc thu hồi quyền phải được ghi nhật ký hệ thống.

## 9. OTP, mật khẩu và bảo vệ phiên

Bảng `ma_xac_minh` dùng chung cho:
- Đăng ký và xác minh email: `DANG_KY`.
- Quên và đặt lại mật khẩu: `DAT_LAI_MAT_KHAU`.
- Đổi email: `DOI_EMAIL`.
- Xác minh số điện thoại: `XAC_MINH_SDT`.

OTP phải có thời hạn, giới hạn số lần thử, giới hạn gửi lại và chỉ được
sử dụng một lần. Database chỉ lưu mã đã băm bằng cơ chế phù hợp.

Không cho phép đăng nhập bằng mật khẩu khi tài khoản chưa đáp ứng điều kiện
xác minh và kích hoạt.

Phiên trình duyệt sử dụng cookie `HttpOnly`. Production bắt buộc HTTPS và
cookie `Secure`. Các request thay đổi dữ liệu phải được bảo vệ chống CSRF.

Đăng nhập cần giới hạn thử sai; không tiết lộ email có tồn tại hay không qua
thông báo lỗi. Không ghi mật khẩu, OTP, token hoặc cookie vào log.

## 10. Quy tắc API và frontend

API công khai không yêu cầu phiên nếu nghiệp vụ không cần đăng nhập.

API dữ liệu cá nhân yêu cầu xác thực tài khoản và kiểm tra quyền sở hữu
tài nguyên. Không yêu cầu người dùng thông thường phải chọn đơn vị làm việc.

API quản trị phải đi qua xác thực, xác định đơn vị, kiểm tra quyền và kiểm tra
chi nhánh khi cần.

Frontend chỉ hiển thị mục quản trị khi backend xác nhận tài khoản có quyền
nội bộ phù hợp. Trang quản trị sử dụng sidebar; giao diện người dùng thông
thường không cần sidebar quản trị.

Ẩn nút, ẩn menu hoặc không hiển thị đường dẫn không thay thế kiểm tra quyền
tại backend. Gọi trực tiếp API bằng Postman vẫn phải bị từ chối nếu không
có quyền hợp lệ.

## 11. Điều kiện hoàn thành F05

F05 chỉ được coi là hoàn thành khi Postman kiểm tra được các luồng sau:

- Người dùng đăng ký, xác nhận OTP, đăng nhập và sử dụng chức năng cá nhân
  mà không cần có bản ghi thành viên đơn vị.
- Tài khoản chưa xác minh hoặc bị khóa không đăng nhập được.
- Nhân viên được mời vào đơn vị và chỉ thấy các đơn vị mình được phân công.
- Nhân viên được chọn chi nhánh trong phạm vi hợp lệ.
- Một tài khoản có thể làm việc ở nhiều đơn vị nhưng quyền hoàn toàn tách biệt.
- Tài khoản A không truy cập dữ liệu quản trị của đơn vị B.
- Nhân viên chi nhánh A không thao tác vượt quyền sang chi nhánh B.
- Người dùng thông thường không truy cập được API quản trị dù tự gửi
  `don_vi_id`, `chi_nhanh_id` hoặc `vai_tro_id`.
- Quyền bị thu hồi có hiệu lực trên request tiếp theo.
- Đổi/đặt lại mật khẩu và đăng xuất làm phiên mất hiệu lực theo chính sách.