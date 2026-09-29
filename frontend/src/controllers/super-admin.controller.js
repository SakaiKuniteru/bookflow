const render = (view, title) => async (req, res) => {
  return res.render(view, {
    title
  });
};

const superAdminController = {
  dashboard: render('super-admin/tong-quan', 'Tổng quan nền tảng'),
  organizations: render('super-admin/don-vi', 'Đơn vị'),
  servicePlans: render('super-admin/goi-dich-vu', 'Gói dịch vụ'),
  subscriptions: render('super-admin/dang-ky-dich-vu', 'Đăng ký dịch vụ'),
  invoices: render('super-admin/hoa-don', 'Hóa đơn'),
  aiUsage: render('super-admin/su-dung-ai', 'Sử dụng AI'),
  auditLogs: render('super-admin/nhat-ky', 'Nhật ký'),
  settings: render('super-admin/cai-dat', 'Cài đặt nền tảng')
};

export default superAdminController;