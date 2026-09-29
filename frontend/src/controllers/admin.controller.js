const render = (view, title) => async (req, res) => {
  return res.render(view, {
    title
  });
};

const adminController = {
  dashboard: render('admin/tong-quan', 'Tổng quan quản trị'),
  branches: render('admin/chi-nhanh', 'Chi nhánh'),
  employees: render('admin/nhan-vien', 'Nhân viên'),
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