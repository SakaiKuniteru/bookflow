# Quy trình thực hiện phân hệ Admin BookFlow

**Bản:** 1.0 · **Loại tài liệu:** thứ tự triển khai các trang quản trị đơn vị từ nền tảng đến kiểm thử.
**Phạm vi:** giao diện `/admin/*` dành cho quản trị đơn vị BookFlow; không bao gồm khu vực nhân viên, khách hàng hoặc Super Admin.
**Căn cứ:** `docs/so-do/quy-trinh-frontend.md`, `docs/so-do/quy-trinh-thuc-hien.md`, cấu trúc route và module hiện có trong repository.

## 0. Quy tắc đọc và thực hiện

1. Làm theo thứ tự nhóm `A → G`; mỗi trang triển khai theo lát cắt `kiểm tra API/quyền → backend nếu thiếu → frontend service → controller/route → view → kiểm thử`.
2. Frontend chỉ hiển thị và gửi yêu cầu. Backend là nơi xác thực token, kiểm tra quyền, tenant/chi nhánh và quyết định nghiệp vụ; không coi việc ẩn menu/nút là bảo mật.
3. Phân biệt `Admin` quản trị một đơn vị với `Super Admin` quản trị toàn nền tảng. Không đưa trang gói dịch vụ, hóa đơn nền tảng, usage AI toàn hệ thống hoặc cấu hình nền tảng vào `/admin/*`.
4. Dùng layout `admin`, API client và partial dùng chung. Không sao chép toàn bộ giao diện nhân viên sang Admin; chỉ làm màn quản trị/cấu hình thuộc quyền đơn vị.
5. Trước khi tạo API mới, đối chiếu `backend/src/modules/` và `backend/src/routes/index.js`; tận dụng API có thật, ghi rõ endpoint còn thiếu, không dựng dữ liệu giả để đánh dấu hoàn thành.
6. Một trang chỉ hoàn thành khi có trạng thái tải/rỗng/lỗi, validation, phân quyền backend, test API/UI cần thiết và tiêu chí nghiệm thu đạt.

## 1. Hiện trạng trong repository

- `frontend/src/routes/admin.route.js` đã khai báo 13 route giao diện: tổng quan, chi nhánh, nhân viên, phân quyền, sách, nhà cung cấp, kho, khách hàng, hội viên, chính sách mượn, thanh toán, báo cáo và cài đặt.
- `frontend/src/views/admin/` hiện có `tong-quan.hbs` và `chua-trien-khai.hbs`. `admin.controller.js` render trang tổng quan; các controller trang còn lại dùng trang placeholder khi view chưa tồn tại.
- `frontend/src/middlewares/locals.js` đang khai báo menu Admin nhưng thiếu các route đã có như phân quyền, nhà cung cấp, chính sách mượn và thanh toán. Cần đồng bộ menu với route và quyền xem.
- Admin route đang dùng các mã quyền chữ hoa như `BRANCH_VIEW`, `EMPLOYEE_VIEW`, `BOOK_MANAGE`; Backend hiện dùng mã dạng `branches.manage`, `members.manage`, `books.read`, `books.create`, `roles.manage`... Cần thống nhất một danh mục mã quyền trước khi mở rộng; không để frontend kiểm tra một bộ mã còn Backend kiểm tra bộ khác.
- Backend đã có API nền cho đơn vị/chi nhánh, nhân viên, phân quyền, sách, nhà cung cấp, kho, khách hàng, hội viên, thanh toán và các nghiệp vụ liên quan. Cần rà từng API và contract trước khi nối trang.
- Chưa thấy module/report route quản trị báo cáo dùng chung; chưa thấy API cài đặt đơn vị hoàn chỉnh hoặc API chính sách mượn tương ứng với trang Admin. Ghi nhận đây là phần cần xác định/nghiệm thu backend, không coi là đã có chỉ vì frontend route tồn tại.

## 2. Thứ tự phụ thuộc

```text
A. Rà quyền, tenant, layout và menu
        ↓
B. Tổng quan Admin
        ↓
C. Chi nhánh → Nhân viên → Phân quyền
        ↓
D. Sách → Nhà cung cấp → Kho
        ↓
E. Khách hàng → Hội viên → Chính sách mượn
        ↓
F. Thanh toán → Báo cáo
        ↓
G. Cài đặt → kiểm thử toàn phân hệ
```

Làm xong nền quyền/đơn vị trước vì các trang sau đều cần phạm vi dữ liệu của đơn vị và quyền tương ứng. Báo cáo làm sau các luồng giao dịch để số liệu lấy từ nguồn dữ liệu đã ổn định.

## 3. Nhóm A — Nền tảng Admin, quyền và điều hướng

**File hiện có:** `frontend/src/routes/admin.route.js`, `frontend/src/controllers/admin.controller.js`, `frontend/src/middlewares/auth.js`, `frontend/src/middlewares/permission.js`, `frontend/src/middlewares/locals.js`, `frontend/src/views/layouts/admin.hbs`.

1. Chốt bảng quyền chuẩn giữa FE và BE. Ưu tiên mã quyền hiện được Backend kiểm tra; cập nhật kiểm tra trang/nút FE về cùng mã. Lập bảng `route Admin → permission → API Backend`.
2. Xác nhận middleware xác thực nhận người dùng từ `userMiddleware`; xác nhận Backend kiểm tra Access Token, tenant và quyền trên từng API. Nếu quyền của Admin bị giới hạn theo chi nhánh thì gắn `branchScope` đúng nơi.
3. Đồng bộ danh sách menu với đủ 13 route Admin; chỉ hiện mục khi người dùng có quyền tương ứng. Người dùng không có quyền truy cập trực tiếp URL phải nhận chuyển hướng/403 phù hợp.
4. Hoàn thiện breadcrumb, tiêu đề trang, trạng thái đang chọn, responsive và liên kết quay về tổng quan trong layout Admin.

**Kiểm tra:** chưa đăng nhập không mở được `/admin/*`; tài khoản đã đăng nhập nhưng thiếu quyền không được mở trang/API; Admin đơn vị A không đọc/ghi dữ liệu đơn vị B; menu và router không có mục lệch nhau.

## 4. Nhóm B — Tổng quan quản trị

**Route:** `GET /admin/tong-quan`. **View hiện có:** `frontend/src/views/admin/tong-quan.hbs`.

1. Chốt dashboard chỉ hiển thị dữ liệu thuộc đơn vị và phạm vi chi nhánh người dùng được phép xem.
2. Xác định chỉ số và nguồn dữ liệu trước khi viết UI: đơn hàng/doanh thu, tồn kho, mượn-trả/quá hạn, hội viên và hoạt động gần đây. Không tự tính chỉ số bằng cách cộng dữ liệu khác phạm vi.
3. Dùng API báo cáo/tổng hợp hiện có nếu đã được xác nhận; nếu chưa có, tạo contract và API backend tổng hợp có phân quyền trước khi nối frontend.
4. Thêm bộ lọc thời gian/chi nhánh nếu nghiệp vụ cần; tất cả bộ lọc phải được Backend validation và tenant-scope.

**Kiểm tra:** số liệu so khớp truy vấn/nguồn chuẩn, đổi chi nhánh/thời gian cập nhật đúng, trạng thái rỗng/lỗi có hướng dẫn và dashboard không lộ dữ liệu ngoài đơn vị.

## 5. Nhóm C — Tổ chức, nhân sự và quyền

### 5.1. Chi nhánh

**Route:** `GET /admin/chi-nhanh`. **Backend liên quan:** `/api/chi-nhanh`, `/api/don-vi`.

Làm danh sách/tìm kiếm, tạo và sửa thông tin, trạng thái chi nhánh, xem chi tiết và phân công nhân viên nếu được phép. Dùng API chi nhánh hiện có; kiểm tra riêng endpoint nào yêu cầu phạm vi `branches.manage` và quyền xem.

### 5.2. Nhân viên

**Route:** `GET /admin/nhan-vien`. **Backend liên quan:** `/api/nhan-vien`, `/api/xac-thuc/nhan-vien`.

Làm danh sách, mời/tạo nhân viên, xem/sửa hồ sơ, trạng thái, chi nhánh, vị trí, lịch sử và gửi lại thư mời theo API hiện có. Không hiển thị token/OTP; hành động mời và phân công cần xác nhận, thông báo kết quả và audit log phù hợp.

### 5.3. Phân quyền

**Route:** `GET /admin/phan-quyen`. **Backend liên quan:** `/api/phan-quyen`.

Làm danh sách vai trò/quyền, chi tiết quyền theo vai trò, gán/thu hồi vai trò thành viên và cập nhật quyền vai trò. Cấm tự nâng quyền vượt quyền người thao tác; quyền nhạy cảm cần kiểm soát backend và ghi nhận lịch sử.

**Kiểm tra chung nhóm C:** tạo/sửa/khóa, phân công chéo chi nhánh/đơn vị, quyền thiếu, thao tác đồng thời và hoạt động sau khi quyền bị thu hồi.

## 6. Nhóm D — Danh mục, nhà cung cấp và kho

### 6.1. Sách

**Route:** `GET /admin/sach`. **Backend liên quan:** `/api/sach`, `/api/phien-ban-sach`, `/api/tac-gia`, `/api/the-loai`, `/api/nha-xuat-ban`, `/api/tep-tin`.

Làm tra cứu danh mục, tạo/sửa/ẩn hoặc khôi phục theo nghiệp vụ, phiên bản/ISBN, tác giả, thể loại, nhà xuất bản, ảnh và trạng thái hiển thị. Tái sử dụng quy trình upload file chung; không tự ghi dữ liệu sách từ trình duyệt.

### 6.2. Nhà cung cấp

**Route:** `GET /admin/nha-cung-cap`. **Backend liên quan:** `/api/nha-cung-cap`.

Làm danh sách, chi tiết, tạo/sửa/khóa và thông tin liên hệ/địa chỉ/hợp đồng nếu API hỗ trợ. Tách thao tác quản lý danh mục nhà cung cấp khỏi tạo phiếu nhập.

### 6.3. Kho

**Route:** `GET /admin/kho`. **Backend liên quan:** `/api/kho`, `/api/nhap-kho`, `/api/ton-kho`, `/api/chuyen-kho`, `/api/kiem-kho`.

Làm danh sách kho/vị trí, tồn bán và bản sao sách, lịch sử biến động, nhập, chuyển và kiểm kê. Tồn kho và bản sao phải phản ánh kết quả Backend sau transaction; không cập nhật tồn trực tiếp từ FE.

**Kiểm tra chung nhóm D:** tenant/chi nhánh, ISBN/mã trùng, ảnh không hợp lệ, tồn âm, nhập/chuyển/kiểm kê lặp và lịch sử kiểm toán.

## 7. Nhóm E — Khách hàng, hội viên và chính sách mượn

### 7.1. Khách hàng

**Route:** `GET /admin/khach-hang`. **Backend liên quan:** `/api/khach-hang`.

Làm danh sách/tìm kiếm, chi tiết, cập nhật trạng thái/thông tin, địa chỉ/liên hệ, lịch sử giao dịch và tương tác theo API. Ẩn hoặc che dữ liệu cá nhân theo quyền cần thiết.

### 7.2. Hội viên

**Route:** `GET /admin/hoi-vien`. **Backend liên quan:** `/api/hoi-vien`.

Làm hạng/gói hội viên, chính sách quyền lợi, đăng ký/chuyển hạng và lịch sử điểm/giao dịch. Hiển thị thời hạn, trạng thái và quyền lợi theo dữ liệu Backend.

### 7.3. Chính sách mượn

**Route:** `GET /admin/chinh-sach-muon`. **Backend hiện có:** chính sách hội viên và một số cấu hình gia hạn/phí phạt; chưa xác định được một API quản lý đầy đủ chính sách mượn dùng cho trang này.

Trước khi làm giao diện, nghiệp vụ phải chốt các quy tắc cần cấu hình: hạn mức, thời hạn, gia hạn, phí quá hạn, đặt trước, đối tượng/chi nhánh áp dụng và ngày hiệu lực. Sau đó thiết kế contract, quyền, migration nếu thiếu, validation, repository/service/controller/route và test. Không tự coi API `/gia-han/cau-hinh` là đầy đủ cho toàn bộ chính sách mượn.

**Kiểm tra chung nhóm E:** quyền xem dữ liệu cá nhân, áp dụng chính sách đúng ngày/chi nhánh, lịch sử thay đổi và hành vi các phiếu đang tồn tại khi chính sách được cập nhật.

## 8. Nhóm F — Thanh toán và báo cáo

### 8.1. Thanh toán

**Route:** `GET /admin/thanh-toan`. **Backend liên quan:** `/api/thanh-toan`, `/api/cong-no`, `/api/tien-coc`.

Làm phương thức/tài khoản nhận, giao dịch thu/chi, khoản phải thu, cọc, hoàn tiền và đối soát theo quyền. Mọi số tiền lấy từ Backend; các thao tác thu/hoàn/chốt phải có xác nhận, chống gửi lặp và lưu người thực hiện.

### 8.2. Báo cáo

**Route:** `GET /admin/bao-cao`. **Hiện trạng:** chưa tìm thấy module/API báo cáo trong danh sách route Backend.

Chốt danh mục báo cáo và định nghĩa công thức trước: doanh thu/đơn hàng, tồn kho, nhập-xuất, mượn-trả/quá hạn, khách hàng/hội viên và đối soát. Tạo contract/API backend có tenant, phạm vi chi nhánh, khoảng thời gian, pagination/export và quyền riêng; chỉ sau đó mới làm bộ lọc, bảng/biểu đồ và tải file ở FE.

**Kiểm tra chung nhóm F:** đối soát tổng báo cáo với giao dịch nguồn, múi giờ/kỳ báo cáo, phân quyền tiền tệ, tenant isolation, dữ liệu lớn và chống lặp thao tác tài chính.

## 9. Nhóm G — Cài đặt đơn vị và hoàn thiện

**Route:** `GET /admin/cai-dat`. **Hiện trạng:** chưa thấy API cài đặt đơn vị tổng quát. Phải xác định cài đặt nào thuộc đơn vị, cài đặt nào thuộc chi nhánh và cài đặt nào chỉ Super Admin quản lý.

1. Chốt nhóm cấu hình đơn vị: thông tin/thương hiệu, vận hành, chính sách giao dịch, thông báo và tích hợp; không để lộ secrets trong response hoặc log.
2. Tạo API/backend permission/audit trước khi thêm form FE; validate giá trị, phạm vi áp dụng và quyền sửa.
3. Hiển thị giá trị hiện tại, cảnh báo cấu hình ảnh hưởng giao dịch, yêu cầu xác nhận khi lưu và thông báo lỗi theo trường.
4. Hoàn thiện tất cả view còn placeholder, breadcrumbs, menu, responsive, trạng thái tải/rỗng/lỗi và điều hướng sau thành công.

## 10. Quy trình code chuẩn cho từng trang

1. Ghi mục tiêu trang, ai được xem/sửa, dữ liệu, trạng thái và tiêu chí nghiệm thu.
2. Đối chiếu schema/migration, API, permission code và response hiện có; phân loại `dùng lại`, `cần bổ sung`, `chưa có`.
3. Nếu Backend thiếu: viết migration khi cần → validation → repository → service/transaction → controller → route với `authenticate`, tenant/branch scope, `authorize` → test API.
4. Viết hoặc cập nhật frontend service gọi API client chung; không viết `fetch` backend rời rạc và không đưa nghiệp vụ/quyền quyết định vào FE.
5. Hoàn thiện route/controller render, view HBS/partials, JS/CSS theo cấu trúc nhóm; giữ layout Admin dùng chung.
6. Kiểm thử quyền và dữ liệu trước, sau đó test form/bảng/trạng thái và luồng trình duyệt; ghi kết quả và lỗi đã xử lý.

## 11. Bộ kiểm thử nghiệm thu phân hệ

| Lớp | Kịch bản bắt buộc |
|---|---|
| Route FE | 13 route Admin render đúng view, không trang chức năng nào rơi về `chua-trien-khai.hbs` khi được công bố hoàn tất. |
| Auth/RBAC | Chưa đăng nhập bị chuyển tới đăng nhập; thiếu quyền nhận 403; quyền bị thu hồi có hiệu lực; không dựa riêng vào ẩn menu. |
| Tenant/branch | Đơn vị A không xem/sửa dữ liệu đơn vị B; scope chi nhánh đúng với tài khoản và quyền. |
| API | API protected trả 401 khi thiếu/sai/hết hạn Access Token, 403 khi thiếu quyền; API công khai hoạt động có/không token theo hợp đồng. |
| Form/data | Validation phía FE/BE, lỗi theo trường, loading/rỗng/lỗi, pagination/tìm kiếm và thao tác lặp. |
| Giao dịch | Tiền, tồn kho, phân quyền, chính sách và số báo cáo khớp nguồn Backend; transaction rollback khi lỗi. |
| UI | Menu khớp routes/quyền; keyboard, responsive, xác nhận hành động rủi ro và không lộ dữ liệu nhạy cảm. |

**Phụ thuộc hiện tại:** backend chưa khai báo script test trong `backend/package.json`; trước khi nghiệm thu từng module, bổ sung/cấu hình lệnh test phù hợp và chạy test integration với database thử nghiệm.

## 12. Điều kiện hoàn thành

- 13 trang Admin có route, view, quyền, dữ liệu thật hoặc được ghi rõ chưa triển khai; không còn placeholder bị hiểu nhầm là chức năng hoàn chỉnh.
- Menu/sidebar khớp với các route và quyền; mã quyền FE/BE cùng một danh mục.
- Các API nghiệp vụ kiểm tra Bearer, quyền và tenant ở backend; dữ liệu hoặc quyền không được tin từ client.
- Các gap về API báo cáo, chính sách mượn và cài đặt đơn vị được giải quyết bằng contract/backend/test, hoặc được loại khỏi phạm vi có quyết định rõ ràng.
- Bộ test theo mục 11 đạt; dashboard, giao dịch tài chính, kho và phân quyền được đối chiếu dữ liệu.

**Tài liệu liên quan:** [Quy trình Frontend](quy-trinh-frontend.md) · [Quy trình thực hiện](quy-trinh-thuc-hien.md) · [Ranh giới phân hệ](../architecture/ranh-gioi-phan-he.md) · [Quy tắc xác thực và phân quyền](../architecture/quy-tac-xac-thuc-va-phan-quyen.md).
