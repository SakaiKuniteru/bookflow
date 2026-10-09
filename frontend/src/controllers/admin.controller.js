import { existsSync } from 'node:fs';
import path from 'node:path';
import profileController from './profile.controller.js';
import branchService from '../services/branch.service.js';
const render = (view, title) => async (req, res) => {
  const viewPath = path.join(req.app.get('views'), `${view}.hbs`);
  const viewDaCo = existsSync(viewPath);
  return res.render(viewDaCo ? view : 'admin/chua-trien-khai', {
    title,
    layout: 'admin'
  });
};

const adminController = {
  async dashboard(req, res) {
    return res.render('admin/tong-quan', { title: 'Tổng quan quản trị', layout: 'admin' });
  },
  profile(req, res, next) { return profileController.render(req, res, next, 'admin'); },
async branches(req, res) {
  const columns = [
      { key: 'stt', label: 'STT', sortable: false, sortType: 'number', width: '56px' },
      { key: 'maChiNhanh', label: 'Mã chi nhánh', sortable: true, sortType: 'text', width: '120px' },
      { key: 'tenChiNhanh', label: 'Tên chi nhánh', sortable: true, sortType: 'text', width: '200px' },
      { key: 'loaiChiNhanh', label: 'Loại', align: 'center', sortable: true, sortType: 'text', width: '110px' },
      { key: 'soDienThoai', label: 'Hotline', sortable: true, sortType: 'text', width: '150px' },
      { key: 'email', label: 'Email', sortable: true, sortType: 'text', width: '220px' },
      { key: 'tenTinhThanh', label: 'Tỉnh/thành', sortable: true, sortType: 'text', width: '160px' },
      { key: 'tenPhuongXa', label: 'Xã/phường', sortable: true, sortType: 'text', width: '160px' },
      { key: 'diaChiChiTiet', label: 'Địa chỉ chi tiết', sortable: true, sortType: 'text', width: '260px' },
      { key: 'choNhanTaiQuay', label: 'Tại quầy', align: 'center', sortable: true, sortType: 'text', width: '100px' },
      { key: 'choBanTrucTuyen', label: 'Trực tuyến', align: 'center', sortable: true, sortType: 'text', width: '120px' },
      { key: 'trangThai', label: 'Trạng thái', align: 'center', sortable: true, sortType: 'text', width: '140px' },
      { key: 'actions', label: 'Thao tác', sortable: false, width: '120px' }
  ];
  return res.render('admin/chi-nhanh', {
    title: 'Chi nhánh',
    layout: 'admin',
    mode: 'api',
    action: '/admin/chi-nhanh',
    ariaLabel: 'Danh sách chi nhánh',
    minWidth: '1990',
    columns,
    rows: [],
    hasRows: false,
    tableLoading: true,
    search: { id: 'branch-search', name: 'q', placeholder: 'Tìm mã, tên, loại hoặc địa chỉ chi nhánh', mode: 'relative', threshold: 100 },
    actions: [{ label: 'Thêm mới', action: 'create-branch', icon: 'plus', variant: 'primary', size: 'md' }],
    branchTypes: [
      { value: 'NHA_SACH', label: 'Nhà sách' },
      { value: 'THU_VIEN', label: 'Thư viện' },
      { value: 'KET_HOP', label: 'Kết hợp' }
    ],
    sort: { key: 'tenChiNhanh', order: 'asc' },
    pagination: { enabled: true, page: 1, pageSize: 20, total: 0, pages: 1, from: 0, to: 0 },
    emptyTitle: 'Chưa có chi nhánh để hiển thị',
    emptyDescription: 'Nếu đơn vị đã có chi nhánh, hãy kiểm tra đơn vị đang chọn hoặc quyền xem chi nhánh của tài khoản.',
    scripts: ['/js/page/admin-chi-nhanh.js?v=20261009-1']
  });
},
async employees(req, res) {
  const nhanVienDaNghi = req.query.trangThai === 'DA_ROI';
  const columns = [
      { key: 'stt', label: 'STT', sortable: false, sortType: 'number', width: '56px' },
      { key: 'maNhanVien', label: 'Mã nhân viên', sortable: true, sortType: 'text', width: '120px' },
      { key: 'hoTen', label: 'Họ và tên', sortable: true, sortType: 'text', width: '180px' },
      { key: 'tenDangNhap', label: 'Tên đăng nhập', sortable: true, sortType: 'text', width: '140px' },
      { key: 'email', label: 'Email', sortable: true, sortType: 'text', width: '210px' },
      { key: 'soDienThoai', label: 'Số điện thoại', sortable: true, sortType: 'text', width: '140px' },
      { key: 'loaiTaiKhoan', label: 'Loại tài khoản', sortable: true, sortType: 'text', width: '140px' },
      { key: 'chucDanh', label: 'Chức danh', sortable: true, sortType: 'text', width: '160px' },
      { key: 'chiNhanh', label: 'Chi nhánh', sortable: false, width: '180px' },
      { key: 'ngayVaoLam', label: 'Ngày vào làm', sortable: true, sortType: 'date', width: '130px' },
      { key: 'soNgayLamViec', label: 'Số ngày làm việc', sortable: true, sortType: 'number', width: '150px' },
      ...(nhanVienDaNghi ? [{ key: 'ngayNghiViec', label: 'Ngày nghỉ việc', sortable: true, sortType: 'date', width: '140px' }, { key: 'lyDoNghiViec', label: 'Lý do nghỉ', sortable: false, width: '220px' }] : []),
      { key: 'trangThai', label: 'Trạng thái', sortable: true, sortType: 'text', width: '110px' },
      { key: 'actions', label: 'Thao tác', sortable: false, width: '160px' }
  ];
  return res.render('admin/nhan-vien', {
    title: nhanVienDaNghi ? 'Nhân viên đã nghỉ' : 'Nhân viên',
    description: nhanVienDaNghi ? 'Danh sách nhân viên đã nghỉ việc trong đơn vị.' : 'Danh sách nhân viên trong đơn vị của bạn.',
    layout: 'admin',
    mode: 'api',
    action: '/admin/nhan-vien',
    ariaLabel: 'Danh sách nhân viên',
    columns,
    rows: [],
    hasRows: false,
    tableLoading: true,
    search: { id: 'employee-search', name: 'q', placeholder: 'Tìm tên, tên đăng nhập hoặc email nhân viên', mode: 'relative', threshold: 100 },
    actions: nhanVienDaNghi ? [] : [{ label: 'Thêm mới', action: 'create-employee', icon: 'plus', variant: 'primary', size: 'md' }],
    genderOptions: [{ value: 'NAM', label: 'Nam' }, { value: 'NU', label: 'Nữ' }, { value: 'KHAC', label: 'Khác' }, { value: 'KHONG_TIET_LO', label: 'Không tiết lộ' }],
    accountTypeOptions: [{ value: 'NHAN_VIEN', label: 'Nhân viên' }, { value: 'QUAN_TRI', label: 'Quản trị viên' }],
    branchOptions: [],
    countryOptions: [],
    ethnicityOptions: [],
    provinceOptions: [],
    wardOptions: [],
    sort: { key: 'hoTen', order: 'asc' },
    pagination: { enabled: true, page: 1, pageSize: 20, total: 0, pages: 1, from: 0, to: 0 },
    emptyTitle: nhanVienDaNghi ? 'Chưa có nhân viên đã nghỉ' : 'Chưa có nhân viên để hiển thị',
    emptyDescription: nhanVienDaNghi ? 'Nhân viên đã nghỉ việc sẽ hiển thị tại đây.' : 'Thêm nhân viên vào đơn vị để hiển thị trong danh sách.',
    scripts: ['/js/page/admin-nhan-vien.js?v=20261009-1']
  });
},
async customers(req, res) {
  const columns = [
      { key: 'stt', label: 'STT', sortable: false, sortType: 'number', width: '40px' },
      { key: 'maKhachHang', label: 'Mã khách hàng', sortable: true, sortType: 'text', width: '120px' },
      { key: 'hoTen', label: 'Khách hàng', sortable: true, sortType: 'text', width: '180px' },
      { key: 'tenDangNhap', label: 'Tên đăng nhập', sortable: true, sortType: 'text', width: '150px' },
      { key: 'ngaySinh', label: 'Ngày sinh', sortable: true, sortType: 'text', width: '120px' },
      { key: 'diaChiChiTiet', label: 'Địa chỉ', sortable: true, sortType: 'text', width: '220px' },
      { key: 'email', label: 'Email', sortable: true, sortType: 'text', width: '200px' },
      { key: 'soDienThoai', label: 'Số điện thoại', sortable: true, sortType: 'text', width: '130px' },
      { key: 'trangThai', label: 'Trạng thái', align: 'center', sortable: true, sortType: 'text', width: '130px' },
      { key: 'actions', label: 'Thao tác', sortable: false, width: '100px' }
  ];
  return res.render('admin/khach-hang', {
    title: 'Khách hàng',
    layout: 'admin',
    mode: 'api',
    action: '/admin/khach-hang',
    ariaLabel: 'Danh sách khách hàng',
    minWidth: '1050',
    columns,
    rows: [],
    hasRows: false,
    tableLoading: true,
    search: { id: 'customer-search', name: 'q', placeholder: 'Tìm mã, họ tên, email hoặc số điện thoại', mode: 'relative', threshold: 100 },
    actions: [{ label: 'Thêm mới', action: 'create-customer', icon: 'plus', variant: 'primary', size: 'md' }],
    genderOptions: [{ value: 'NAM', label: 'Nam' }, { value: 'NU', label: 'Nữ' }, { value: 'KHAC', label: 'Khác' }, { value: 'KHONG_TIET_LO', label: 'Không tiết lộ' }],
    sort: { key: 'hoTen', order: 'asc' },
    pagination: { enabled: true, page: 1, pageSize: 20, total: 0, pages: 1, from: 0, to: 0 },
    emptyTitle: 'Chưa có khách hàng để hiển thị',
    emptyDescription: 'Thêm mới khách hàng để hiển thị trong danh sách.',
    scripts: ['/js/page/admin-khach-hang.js?v=20261009-4']
  });
},
  permissions: render('admin/phan-quyen', 'Phân quyền'),
  books: render('admin/sach', 'Quản lý sách'),
  authors: render('admin/tac-gia', 'Tác giả'),
  genres: render('admin/the-loai', 'Thể loại'),
  publishers: render('admin/nha-xuat-ban', 'Nhà xuất bản'),
  bookVersions: render('admin/phien-ban-sach', 'Phiên bản sách'),
  suppliers: render('admin/nha-cung-cap', 'Nhà cung cấp'),
  warehouses: render('admin/kho', 'Quản trị kho'),
  stockImport: render('admin/kho/nhap-kho', 'Nhập kho'),
  stockTransfer: render('admin/kho/chuyen-kho', 'Xuất kho / Điều chuyển kho'),
  inventory: render('admin/kho/ton-kho', 'Danh sách tồn kho'),
  inventorySummary: render('admin/kho/ton-kho/tong-hop', 'Tổng hợp tồn kho'),
  inventoryHistory: render('admin/kho/ton-kho/lich-su', 'Lịch sử tồn kho'),
  stocktake: render('admin/kho/kiem-kho', 'Kiểm kho'),
  memberships: render('admin/hoi-vien', 'Hội viên'),
  borrowPolicies: render('admin/chinh-sach-muon', 'Chính sách mượn'),
  payments: render('admin/thanh-toan', 'Thanh toán'),
  reports: render('admin/bao-cao', 'Báo cáo'),
  settings: render('admin/cai-dat', 'Cài đặt')
};

export default adminController;
