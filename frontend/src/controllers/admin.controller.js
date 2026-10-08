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
      { key: 'stt', label: 'STT', sortable: false, sortType: 'number', width: '40px' },
      { key: 'maChiNhanh', label: 'Mã chi nhánh', sortable: true, sortType: 'text', width: '100px' },
      { key: 'tenChiNhanh', label: 'Tên chi nhánh', sortable: true, sortType: 'text', width: '200px' },
      { key: 'loaiChiNhanh', label: 'Loại', align: 'center', sortable: true, sortType: 'text', width: '100px' },
      { key: 'diaChiChiTiet', label: 'Địa chỉ chi tiết', sortable: true, sortType: 'text', width: '200px' },
      { key: 'maTinhThanh', label: 'Mã tỉnh/thành', sortable: true, sortType: 'text', width: '100px' },
      { key: 'actions', label: 'Thao tác', sortable: false, width: '120px' }
  ];
  return res.render('admin/chi-nhanh', {
    title: 'Chi nhánh',
    layout: 'admin',
    mode: 'client',
    action: '/admin/chi-nhanh',
    ariaLabel: 'Danh sách chi nhánh',
    minWidth: '1050',
    columns,
    rows: [],
    hasRows: false,
    tableLoading: true,
    search: { id: 'branch-search', name: 'q', placeholder: 'Tìm mã, tên, loại hoặc địa chỉ chi nhánh', mode: 'relative', threshold: 100 },
    actions: [{ label: 'Thêm chi nhánh', action: 'create-branch', icon: 'plus', variant: 'primary', size: 'md' }],
    branchTypes: [
      { value: 'NHA_SACH', label: 'Nhà sách' },
      { value: 'THU_VIEN', label: 'Thư viện' },
      { value: 'KET_HOP', label: 'Kết hợp' }
    ],
    sort: { key: 'tenChiNhanh', order: 'asc' },
    pagination: { enabled: true, page: 1, pageSize: 20, total: 0, pages: 1, from: 0, to: 0 },
    emptyTitle: 'Chưa có chi nhánh để hiển thị',
    emptyDescription: 'Nếu đơn vị đã có chi nhánh, hãy kiểm tra đơn vị đang chọn hoặc quyền xem chi nhánh của tài khoản.',
    scripts: ['/js/page/admin-chi-nhanh.js?v=20261008-1']
  });
},
  async employees(req, res) {
  const columns = [
      { key: 'stt', label: 'STT', sortable: false, sortType: 'number', width: '40px' },
      { key: 'hoTen', label: 'Họ và tên', sortable: true, sortType: 'text', width: '100px' },
      { key: 'tenDangNhap', label: 'Tên đăng nhập', sortable: true, sortType: 'text', width: '100px' },
      { key: 'email', label: 'Email', sortable: true, sortType: 'text', width: '200px' },
      { key: 'loaiTaiKhoan', label: 'Loại tài khoản', sortable: true, sortType: 'text', width: '100px' },
      { key: 'chiNhanh', label: 'Chi nhánh', sortable: false, width: '150px' },
      { key: 'trangThai', label: 'Trạng thái', sortable: true, sortType: 'text', width: '100px' },
      { key: 'actions', label: 'Thao tác', sortable: false, width: '120px' }
  ];
  return res.render('admin/nhan-vien', {
    title: 'Nhân viên',
    layout: 'admin',
    mode: 'client',
    action: '/admin/nhan-vien',
    ariaLabel: 'Danh sách nhân viên',
    columns,
    rows: [],
    hasRows: false,
    tableLoading: true,
    search: { id: 'employee-search', name: 'q', placeholder: 'Tìm tên, tên đăng nhập hoặc email nhân viên', mode: 'relative', threshold: 100 },
    actions: [{ label: 'Thêm nhân viên', action: 'create-employee', icon: 'plus', variant: 'primary', size: 'md' }],
    genderOptions: [{ value: 'NAM', label: 'Nam' }, { value: 'NU', label: 'Nữ' }, { value: 'KHAC', label: 'Khác' }, { value: 'KHONG_TIET_LO', label: 'Không tiết lộ' }],
    accountTypeOptions: [{ value: 'NHAN_VIEN', label: 'Nhân viên' }, { value: 'QUAN_TRI', label: 'Quản trị viên' }],
    branchOptions: [],
    countryOptions: [],
    ethnicityOptions: [],
    provinceOptions: [],
    wardOptions: [],
    sort: { key: 'hoTen', order: 'asc' },
    pagination: { enabled: true, page: 1, pageSize: 20, total: 0, pages: 1, from: 0, to: 0 },
    emptyTitle: 'Chưa có nhân viên để hiển thị',
    emptyDescription: 'Thêm nhân viên vào đơn vị để hiển thị trong danh sách.',
    scripts: ['/js/page/admin-nhan-vien.js?v=20261008-1']
  });
},
  permissions: render('admin/phan-quyen', 'Phân quyền'),
  books: render('admin/sach', 'Quản lý sách'),
  suppliers: render('admin/nha-cung-cap', 'Nhà cung cấp'),
  warehouses: render('admin/kho', 'Kho'),
  customers: render('admin/khach-hang', 'Khách hàng'),
  memberships: render('admin/hoi-vien', 'Hội viên'),
  borrowPolicies: render('admin/chinh-sach-muon', 'Chính sách mượn'),
  payments: render('admin/thanh-toan', 'Thanh toán'),
  reports: render('admin/bao-cao', 'Báo cáo'),
  settings: render('admin/cai-dat', 'Cài đặt')
};

export default adminController;
