# Quy trình thực hiện Frontend BookFlow

## 1. Mục tiêu

Frontend BookFlow sử dụng Handlebars + Bootstrap + JavaScript, chịu trách nhiệm:
- Phục vụ giao diện web.
- Render các trang theo khu vực và vai trò.
- Gọi Backend API để lấy và gửi dữ liệu nghiệp vụ.
- Kiểm soát việc người dùng có được xem trang/giao diện hay không.
- Tái sử dụng layout, partial, component và form chung.
- Quản lý CSS, JavaScript, SVG, logo, hình ảnh và tài nguyên frontend.
- Build và đóng gói frontend để chạy độc lập hoặc trong Docker.

Frontend không thay thế cơ chế phân quyền của Backend. Backend vẫn là nơi quyết định quyền nghiệp vụ thực tế.

## 2. Cấu trúc frontend

```text
frontend/
├── src/
│   ├── server.js
│   ├── app.js
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── helpers/
│   ├── views/
│   │   ├── layouts/
│   │   ├── partials/
│   │   ├── components/
│   │   └── pages/
│   ├── assets/
│   │   ├── icons/
│   │   └── brand/
│   └── public/
│       ├── css/
│       ├── js/
│       ├── icons/
│       ├── brand/
│       ├── images/
│       └── fonts/
├── scripts/
├── tests/
├── package.json
├── package-lock.json
├── .env.example
├── .dockerignore
└── Dockerfile
```

## 3. Nguyên tắc thực hiện

Không làm toàn bộ frontend theo kiểu viết page trước rồi mới quay lại xây nền tảng dùng chung.

Thứ tự chính:

```text
Nền tảng
    ↓
Assets + Build
    ↓
Layouts
    ↓
Partials
    ↓
Components
    ↓
Public
    ↓
Auth
    ↓
Customer
    ↓
Staff
    ↓
Admin
    ↓
Super Admin
    ↓
CSS + JavaScript hoàn thiện
    ↓
Kết nối Backend API
    ↓
Phân quyền giao diện
    ↓
Tests
    ↓
Build
    ↓
Docker
    ↓
Kiểm tra toàn bộ flow
```

## 4. Giai đoạn 01 — Frontend Foundation

Thực hiện trước:

```text
frontend/package.json
frontend/.env.example
frontend/.dockerignore
frontend/Dockerfile

frontend/src/server.js
frontend/src/app.js

frontend/src/config/
frontend/src/routes/
frontend/src/controllers/
frontend/src/services/
frontend/src/middlewares/
frontend/src/helpers/
```

### 4.1. server.js
Là điểm khởi động HTTP của frontend. Nhiệm vụ: đọc cấu hình môi trường, khởi động Express/server và graceful shutdown nếu cần.

### 4.2. app.js
Khởi tạo Express, middleware chung, Handlebars, static assets, body parser, cookie/session nếu cần, routes và error handler.

### 4.3. config/
Quản lý cấu hình môi trường, Handlebars, đường dẫn views, static assets và route configuration nếu cần.

### 4.4. routes/
Định nghĩa route giao diện theo public, auth, customer, staff, admin, super-admin.

### 4.5. controllers/
Chuẩn bị dữ liệu để render page. Không chứa toàn bộ logic gọi API nếu logic đó có thể tái sử dụng trong service.

### 4.6. services/
Là lớp client gọi Backend API. Chịu trách nhiệm gửi request, nhận response, chuẩn hóa lỗi cần hiển thị và truyền dữ liệu về controller. Không đưa nghiệp vụ Backend vào frontend service.

### 4.7. middlewares/
Xử lý thông tin người dùng, trạng thái đăng nhập, quyền xem trang, redirect và lỗi frontend.

## 5. Giai đoạn 02 — Assets và Build

```text
frontend/src/assets/
├── icons/
└── brand/
```

Đây là nguồn tài nguyên gốc. Icon và logo sử dụng tài nguyên tự thiết kế theo định hướng BookFlow.

Sau build:

```text
frontend/src/public/
├── icons/
├── brand/
├── images/
└── fonts/
```

Scripts:

```text
frontend/scripts/
```

Nhiệm vụ: build SVG, tạo sprite nếu có, build/copy brand assets, build tài nguyên frontend và kiểm tra trước build.

Luồng:

```text
assets/icons + assets/brand
        ↓
     scripts/
        ↓
      build
        ↓
public/icons + public/brand
```

## 6. Giai đoạn 03 — Layouts

```text
frontend/src/views/layouts/
├── main.hbs
├── auth.hbs
├── customer.hbs
├── staff.hbs
├── admin.hbs
└── super-admin.hbs
```

Xác định HTML shell, head, CSS/JS chung, header/footer, content, sidebar khi cần và responsive.

## 7. Giai đoạn 04 — Partials dùng chung

Phải hoàn thành partials trước khi triển khai hàng loạt pages.

### 7.1. Navigation

```text
partials/navigation/
├── dau-trang.hbs
├── chan-trang.hbs
├── thanh-ben.hbs
├── duong-dan.hbs
├── menu-tai-khoan.hbs
└── menu-thong-bao.hbs
```

### 7.2. UI

```text
partials/ui/
├── icon.hbs
├── nut-bam.hbs
├── nhan.hbs
├── dang-tai.hbs
├── khong-co-du-lieu.hbs
└── nhan-trang-thai.hbs
```

### 7.3. Forms

```text
partials/forms/
├── input.hbs
├── email.hbs
├── password.hbs
├── money.hbs
├── date.hbs
├── select.hbs
├── textarea.hbs
├── checkbox.hbs
├── radio.hbs
├── file.hbs
├── image.hbs
├── rich-text.hbs
├── button.hbs
└── search.hbs
```

bây giờ hãy viết hạng mục này cho t
quy tắc như sau
input là gọi ra thì nhập free text

number sẽ là gồm: 
số âm, số dương (cả số nguyên và số lẻ); số nguyên âm; số nguyên dương (chỉ số nguyên) => gọi cái nào => nhập theo quy tắc đó
tự động nhận diện chuyển thành 1.234 ví dụ nhập 1234=>1.234 
xoa 1 số tự nhảy ngược ví dụ đang hiển thị 12.345 xoá số 4 => 1.235
nhập 01=> thành 1; nhập 0,1 giữu nguyên

email: tự động kiểm tra định dạng email

password tự động ẩn và có icon để xem và ẩn

money: tự động nhảy định dạng tiền gần giống với number

date sẽ có 3 dạng
1: có cả dd/MM/yyyy HH;mm;ss
2 chỉ có dd/MM/yyyy
3. chỉ có HH;mm;ss
gọi cái nào => thành dạng đó có thể dựa vào thiết kế và css của mẫu kia để làm. thiết kế theo mẫu y hết chỉ khác là sẽ có 3 dạng


select sẽ có dạng
1. chọn 1 cái duy nhất
2. chọn 1 cái duy nhất hoặc chọn tất cả tức có nút tất cả
3. chọn nhiều cái hoặc hiện nút tất cả
4. sẽ có search hoặc không có 
5. khi chưa chọn thì là icon mũi tên đóng mở select những đã chọn => thay bằng dấu x
6. khi chọn sẽ hiện luôn trên ô chọn đó để nhìn thấy 
7. có thể dùng mũi nút mũi tên lên xuống để di chuyển vị trí chọn
8. mặc định đang ở ô đầu tiên
1; 2; 3; 4 => goin cái nào thì hiện ra cái đó ví dụ search=true => có search

textarea số lượng dòng phụ thuộc vào trong form gọi

checkbox, radio làm như bình thường

file sec có nút tải file lên, xoá file và ấn vào tên để dowload
ví dụ dowload=true thì ấn vào thì lưu file = false thì ấn vào ko có gì

image: kích thước dài rộng phụ thuộc vào form gọi và cố định theo kích thước form gọi ép ảnh bằng kích thước đó
có thêm icon mắt để mở rộng thành modail xem ảnh đó
icon xoá để xoá ảnh

rich-text phục vụ văn bản có định dạng như căn trái/giữa/phải, căn đều, cỡ chữ, đậm/nghiêng/gạch chân, danh sách, liên kết và các định dạng cần thiết khác.


button: màu sắc sẽ phụ thuộc vào form gọi

search: có icon tìm kiếm chìm; commad + K hoặc ctrl + K để mửo nhanh
enter đẻ tìm

`rich-text.hbs` phục vụ văn bản có định dạng như căn trái/giữa/phải, căn đều, cỡ chữ, đậm/nghiêng/gạch chân, danh sách, liên kết và các định dạng cần thiết khác.

### 7.4. Tables

```text
partials/tables/
├── data-table.hbs
├── toolbar.hbs
├── filters.hbs
├── pagination.hbs
├── empty-state.hbs
└── loading-state.hbs
```

### 7.5. Modals

```text
partials/modals/
├── base-modal.hbs
├── form-modal.hbs
├── confirm-modal.hbs
└── detail-modal.hbs
```

### 7.6. Feedback

```text
partials/feedback/
├── toast.hbs
├── alert.hbs
├── error-page.hbs
└── no-permission.hbs
```

## 8. Giai đoạn 05 — Components

```text
components/
├── sach/
│   ├── the-sach.hbs
│   ├── bo-suu-tap-anh.hbs
│   ├── trang-thai-sach.hbs
│   └── hinh-thuc-cung-cap.hbs
├── khach-hang/
│   └── the-khach-hang.hbs
├── hoi-vien/
│   └── the-goi-hoi-vien.hbs
├── kho/
│   └── trang-thai-ton-kho.hbs
├── muon-tra/
│   ├── trang-thai-phieu-muon.hbs
│   └── han-tra.hbs
└── thanh-toan/
    ├── trang-thai-thanh-toan.hbs
    └── phuong-thuc-thanh-toan.hbs
```

Component là UI có ý nghĩa nghiệp vụ và được sử dụng ở nhiều page.

## 9. Giai đoạn 06 — Public Pages

```text
pages/public/
├── trang-chu.hbs
├── danh-sach-sach.hbs
├── chi-tiet-sach.hbs
├── tim-kiem.hbs
├── goi-hoi-vien.hbs
└── gioi-thieu.hbs
```

Luồng:

```text
Trang chủ → Danh sách sách → Chi tiết sách → Tìm kiếm → Gói hội viên → Giới thiệu
```

## 10. Giai đoạn 07 — Authentication

```text
pages/auth/
├── dang-nhap.hbs
├── dang-ky.hbs
├── quen-mat-khau.hbs
└── dat-lai-mat-khau.hbs
```

Sử dụng `auth.hbs` và kết nối Route → Controller → Service → Backend API.

## 11. Giai đoạn 08 — Customer

```text
pages/customer/
├── tong-quan.hbs
├── gio-hang.hbs
├── thanh-toan.hbs
├── don-hang.hbs
├── chi-tiet-don-hang.hbs
├── yeu-cau-muon.hbs
├── sach-dang-muon.hbs
├── chi-tiet-phieu-muon.hbs
├── dat-truoc-sach.hbs
├── hoi-vien.hbs
├── thong-bao.hbs
└── ho-so.hbs
```

Luồng chính:

```text
Dashboard → Tìm sách → Chi tiết sách → Giỏ hàng → Thanh toán → Đơn hàng
→ Mượn sách → Đặt trước → Hội viên → Thông báo → Hồ sơ
```

## 12. Giai đoạn 09 — Staff

```text
pages/staff/
├── tong-quan.hbs
├── sach/
├── kho/
├── ban-hang/
├── muon-tra/
└── khach-hang/
```

Thứ tự nghiệp vụ:

```text
Tổng quan → Sách → Kho → Bán hàng → Mượn trả → Khách hàng
```

### 12.1. Sách

```text
staff/sach/
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

### 12.2. Kho

```text
staff/kho/
├── ton-kho.hbs
├── ban-sao-sach.hbs
├── nhap-kho.hbs
└── chuyen-kho.hbs
```

### 12.3. Bán hàng

```text
staff/ban-hang/
├── ban-hang-tai-quay.hbs
├── danh-sach-don.hbs
├── chi-tiet-don.hbs
└── tra-hang.hbs
```

### 12.4. Mượn trả

```text
staff/muon-tra/
├── danh-sach-phieu-muon.hbs
├── tao-phieu-muon.hbs
├── chi-tiet-phieu-muon.hbs
├── nhan-tra-sach.hbs
├── danh-sach-dat-truoc.hbs
└── sach-qua-han.hbs
```

### 12.5. Khách hàng

```text
staff/khach-hang/
├── danh-sach-khach-hang.hbs
├── chi-tiet-khach-hang.hbs
└── partials/
    └── bieu-mau-khach-hang.hbs
```

## 13. Giai đoạn 10 — Admin

```text
pages/admin/
├── tong-quan.hbs
├── chi-nhanh/
├── nhan-vien/
├── phan-quyen/
├── sach/
├── nha-cung-cap/
├── kho/
├── khach-hang/
├── hoi-vien/
├── chinh-sach-muon/
├── thanh-toan/
├── bao-cao/
└── cai-dat/
```

Thứ tự:

```text
Tổng quan → Chi nhánh → Nhân viên → Phân quyền → Sách → Nhà cung cấp
→ Kho → Khách hàng → Hội viên → Chính sách mượn → Thanh toán
→ Báo cáo → Cài đặt
```

## 14. Giai đoạn 11 — Super Admin

```text
pages/super-admin/
├── tong-quan.hbs
├── don-vi/
├── goi-dich-vu/
├── dang-ky-dich-vu/
├── hoa-don/
├── su-dung-ai/
├── nhat-ky/
└── cai-dat/
```

Thứ tự:

```text
Tổng quan → Đơn vị → Gói dịch vụ → Đăng ký dịch vụ → Hóa đơn
→ Sử dụng AI → Nhật ký → Cài đặt
```

## 15. Giai đoạn 12 — CSS

```text
public/css/
├── base/
├── layout/
├── components/
├── forms/
├── tables/
├── modals/
├── feedback/
└── pages/
```

Thứ tự:

```text
Base → Layout → Components → Forms → Tables → Modals → Feedback → Pages
```

## 16. Giai đoạn 13 — JavaScript

```text
public/js/
├── core/
├── components/
├── forms/
├── tables/
└── pages/
```

Thứ tự:

```text
Core → Components → Forms → Tables → Pages
```

JavaScript dùng chung không chứa logic nghiệp vụ riêng của một page.

## 17. Giai đoạn 14 — Kết nối Backend API

Luồng:

```text
Browser
    ↓
Route
    ↓
Middleware
    ↓
Controller
    ↓
Frontend Service
    ↓
Backend API
    ↓
Response
    ↓
Controller
    ↓
Handlebars
```

Frontend không tự thay đổi dữ liệu nghiệp vụ mà Backend là nguồn dữ liệu chính.

## 18. Giai đoạn 15 — Phân quyền giao diện

Frontend kiểm soát:
- Có được mở trang hay không.
- Menu nào được hiển thị.
- Nút/thao tác nào được hiển thị.
- Trang nào cần đăng nhập.
- Trang nào cần vai trò/quyền.
- Hiển thị `khong-du-quyen.hbs` khi cần.

Phạm vi:

```text
public → không yêu cầu đăng nhập
auth → xác thực tài khoản
customer → khu vực khách hàng
staff → khu vực nhân viên + quyền nghiệp vụ
admin → khu vực quản trị + quyền quản trị
super-admin → khu vực quản trị SaaS
```

Ẩn nút không phải cơ chế bảo mật. Backend vẫn phải kiểm tra quyền cho mọi API nghiệp vụ.

## 19. Giai đoạn 16 — Tests

```text
frontend/tests/
├── config
├── routes
├── controllers
├── services
├── helpers
├── views
└── integration
```

Kiểm tra:
- Render.
- API thành công/lỗi.
- Không đăng nhập.
- Không đủ quyền.
- Không có dữ liệu.
- Loading.
- Form validation.
- Upload file.
- Upload nhiều file khi nghiệp vụ yêu cầu.
- Responsive.

## 20. Giai đoạn 17 — Build

```text
Source
    ↓
Build SVG
    ↓
Build brand assets
    ↓
Build/copy static assets
    ↓
Build templates
    ↓
Run tests
    ↓
Frontend build hoàn chỉnh
```

## 21. Giai đoạn 18 — Docker

```text
Dockerfile
    ↓
Docker build
    ↓
Docker run
    ↓
Kiểm tra HTTP
    ↓
Kiểm tra static assets
    ↓
Kiểm tra API connection
```

Kiểm tra container, environment variables, port, Handlebars views, static assets, Backend API connection, health endpoint nếu có và graceful shutdown.

## 22. Giai đoạn 19 — Kiểm tra toàn bộ frontend

```text
1. Server khởi động
        ↓
2. Layout render
        ↓
3. Partials render
        ↓
4. Components render
        ↓
5. Public pages
        ↓
6. Auth pages
        ↓
7. Customer pages
        ↓
8. Staff pages
        ↓
9. Admin pages
        ↓
10. Super-admin pages
        ↓
11. API integration
        ↓
12. Permission
        ↓
13. Error handling
        ↓
14. Responsive
        ↓
15. Build
        ↓
16. Docker
```

## 23. Thứ tự triển khai tổng thể

```text
01. Frontend package + environment
        ↓
02. server.js + app.js
        ↓
03. config
        ↓
04. routes
        ↓
05. controllers
        ↓
06. services
        ↓
07. middlewares
        ↓
08. helpers
        ↓
09. assets + scripts
        ↓
10. layouts
        ↓
11. partials/navigation
        ↓
12. partials/ui
        ↓
13. partials/forms
        ↓
14. partials/tables
        ↓
15. partials/modals
        ↓
16. partials/feedback
        ↓
17. components
        ↓
18. public pages
        ↓
19. auth pages
        ↓
20. customer pages
        ↓
21. staff pages
        ↓
22. admin pages
        ↓
23. super-admin pages
        ↓
24. CSS
        ↓
25. JavaScript
        ↓
26. Backend API integration
        ↓
27. Frontend permission handling
        ↓
28. Tests
        ↓
29. Build
        ↓
30. Docker
        ↓
31. Full-flow verification
```

## 24. Nguyên tắc hoàn thành từng giai đoạn

```text
Code
  ↓
Render được
  ↓
Không lỗi console/server
  ↓
Có responsive cơ bản
  ↓
Có loading
  ↓
Có empty state
  ↓
Có error state
  ↓
Có trạng thái không đủ quyền nếu cần
  ↓
Test
  ↓
Mới chuyển giai đoạn
```

## 25. Kết quả cuối cùng

```text
Frontend
├── Server Express
├── Handlebars
├── Layout system
├── Partial system
├── Component system
├── Public pages
├── Auth pages
├── Customer pages
├── Staff pages
├── Admin pages
├── Super-admin pages
├── Form system
├── Table system
├── Modal system
├── Feedback system
├── CSS system
├── JavaScript system
├── API client
├── Permission-aware UI
├── Tests
├── Build scripts
└── Docker support
```

Luồng hoàn chỉnh:

```text
User
  ↓
Browser
  ↓
Frontend Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Backend API
  ↓
Controller
  ↓
Layout
  ↓
Partial / Component
  ↓
Handlebars
  ↓
HTML
  ↓
Browser
```
