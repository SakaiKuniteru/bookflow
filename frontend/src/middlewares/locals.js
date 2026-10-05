import config from '../config/index.js';
const layMaVaiTro = user => {
  const values = Array.isArray(user?.vai_tro) ? user.vai_tro : Array.isArray(user?.vaiTro) ? user.vaiTro : Array.isArray(user?.roles) ? user.roles : [];
  return values.map(item => typeof item === 'string' ? item : item?.ma_vai_tro ?? item?.maVaiTro).filter(Boolean);
};
const taoLienKetKhongGian = (user, currentPath) => {
  if (!user) return [];
  const vaiTro = layMaVaiTro(user);
  const quyen = (user?.quyen || user?.permissions || []).map(item => typeof item === 'string' ? item : item?.ma_quyen || item?.maQuyen).filter(Boolean);
  const isSuperAdmin = vaiTro.includes('SUPER_ADMIN') || quyen.some(item => item.startsWith('SUPER_ADMIN_'));
  const isAdmin = vaiTro.includes('QUAN_TRI');
  const isStaff = vaiTro.includes('NHAN_VIEN') || vaiTro.includes('THU_THU');
  if (!isSuperAdmin && !isAdmin && !isStaff) return [];
  const choices = [{ label: 'Người dùng', interface: 'customer', prefix: '/customer', href: '/customer/tong-quan' }];
  if (isSuperAdmin || isAdmin || isStaff) choices.push({ label: 'Nhân viên', interface: 'staff', prefix: '/staff', href: '/staff/tong-quan' });
  if (isSuperAdmin || isAdmin) choices.push({ label: 'Admin', interface: 'admin', prefix: '/admin', href: '/admin/tong-quan' });
  if (isSuperAdmin) choices.push({ label: 'Super Admin', interface: 'super-admin', prefix: '/super-admin', href: '/super-admin/tong-quan' });
  return choices.map(item => ({ ...item, active: currentPath.startsWith(item.prefix) }));
};
const localsMiddleware = (req, res, next) => {
  const defaultNavigation = {
    accountLinks: taoLienKetKhongGian(req.user, req.path),
    headerLinks: [
      { label: 'Trang chủ', href: '/' },
      { label: 'Khám phá sách', href: '/sach' },
      { label: 'Mượn & thuê', href: '/sach?loai=muon' },
      { label: 'Hội viên', href: '/goi-hoi-vien' },
      { label: 'Đơn hàng', href: '/customer/don-hang' }
    ].map(item => ({ ...item, active: item.href === '/' ? req.path === '/' : req.path === item.href || req.path.startsWith(`${item.href}/`) }))
  };
  const workspaceMenus = [
    { prefix: '/customer', title: 'Không gian bạn đọc', entries: [['Tổng quan', '/customer/tong-quan'], ['Giỏ hàng', '/customer/gio-hang'], ['Đơn hàng', '/customer/don-hang'], ['Yêu cầu mượn', '/customer/yeu-cau-muon'], ['Sách đang mượn', '/customer/sach-dang-muon'], ['Đặt trước', '/customer/dat-truoc-sach'], ['Hội viên', '/customer/hoi-vien'], ['Hồ sơ', '/customer/ho-so']] },
    { prefix: '/staff', title: 'Không gian nhân viên', entries: [['Tổng quan', '/staff/tong-quan'], ['Danh mục sách', '/staff/sach'], ['Tồn kho', '/staff/kho/ton-kho'], ['Nhập kho', '/staff/kho/nhap-kho'], ['Bán hàng', '/staff/ban-hang'], ['Mượn và trả', '/staff/muon-tra'], ['Khách hàng', '/staff/khach-hang']] },
    { prefix: '/admin', title: 'Quản trị đơn vị', entries: [['Tổng quan', '/admin/tong-quan'], ['Chi nhánh', '/admin/chi-nhanh'], ['Nhân viên', '/admin/nhan-vien'], ['Sách', '/admin/sach'], ['Kho', '/admin/kho'], ['Khách hàng', '/admin/khach-hang'], ['Hội viên', '/admin/hoi-vien'], ['Báo cáo', '/admin/bao-cao'], ['Cài đặt', '/admin/cai-dat']] },
    { prefix: '/super-admin', title: 'Quản trị nền tảng', entries: [['Tổng quan', '/super-admin/tong-quan'], ['Đơn vị', '/super-admin/don-vi'], ['Gói dịch vụ', '/super-admin/goi-dich-vu'], ['Đăng ký dịch vụ', '/super-admin/dang-ky-dich-vu'], ['Hóa đơn', '/super-admin/hoa-don'], ['Sử dụng AI', '/super-admin/su-dung-ai'], ['Nhật ký', '/super-admin/nhat-ky'], ['Cài đặt', '/super-admin/cai-dat']] }
  ];
  const workspace = workspaceMenus.find(menu => req.path.startsWith(menu.prefix));
  res.locals.app = {
    name: config.app.name,
    url: config.app.url
  };
  res.locals.request = {
    id: req.requestId
  };
  res.locals.user = req.user;
  res.locals.authenticated = Boolean(req.user);
  res.locals.bfAccessToken = req.user && req.authToken ? req.authToken : '';
  if (req.user) res.set('Cache-Control', 'private, no-store');
  res.locals.permissions = req.user?.permissions || [];
  res.locals.roles = req.user?.roles || [];
  res.locals.currentPath = req.path;
  res.locals.loginUrl = `/auth/dang-nhap?redirect=${encodeURIComponent(req.originalUrl || '/')}`;
  res.locals.flash = req.flash || null;
  res.locals.navigation = { ...defaultNavigation, ...(workspace ? { sidebarTitle: workspace.title, sidebarItems: workspace.entries.map(([label, href]) => ({ label, href, active: req.path === href || req.path.startsWith(`${href}/`) })) } : {}), ...(res.locals.navigation || {}) };
  next();
};

export default localsMiddleware;
