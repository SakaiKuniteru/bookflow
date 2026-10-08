import config from '../config/index.js';
const taoMucSidebar = (muc, req) => {
  const giaTri = Array.isArray(muc) ? { label: muc[0], href: muc[1] } : muc;
  const con = giaTri.children?.map(mucCon => taoMucSidebar(mucCon, req));
  let active = false;
  if (giaTri.href) {
    const url = new URL(giaTri.href, 'http://bookflow.local');
    const dungDuongDan = req.path === url.pathname;
    const dungTruyVan = [...url.searchParams].every(([ten, value]) => String(req.query[ten] ?? '') === value);
    const biLoaiTru = Object.entries(giaTri.excludeQuery || {}).some(([ten, value]) => String(req.query[ten] ?? '') === String(value));
    active = dungDuongDan && dungTruyVan && !biLoaiTru;
  }
  return { ...giaTri, ...(con ? { children: con } : {}), active: con ? con.some(mucCon => mucCon.active) : active };
};
const layMaVaiTro = user => {
  const values = Array.isArray(user?.vaiTro) ? user.vaiTro : Array.isArray(user?.roles) ? user.roles : [];
  return values.map(item => typeof item === 'string' ? item : item?.maVaiTro).filter(Boolean);
};
const taoLienKetKhongGian = (user, currentPath) => {
  if (!user) return [];
  const vaiTro = layMaVaiTro(user);
  const quyen = (user?.quyen || user?.permissions || []).map(item => typeof item === 'string' ? item : item?.maQuyen).filter(Boolean);
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
    { prefix: '/admin', title: 'Quản trị đơn vị', entries: [
      { label: 'Tổng quan', href: '/admin/tong-quan' },
      { label: 'Chi nhánh', href: '/admin/chi-nhanh' },
      { label: 'Tài khoản', children: [
        { label: 'Khách hàng', href: '/admin/khach-hang' },
        { label: 'Nhân viên', href: '/admin/nhan-vien', excludeQuery: { trangThai: 'DA_ROI' } },
        { label: 'Nhân viên đã nghỉ', href: '/admin/nhan-vien?trangThai=DA_ROI' }
      ] },
      { label: 'Quản lý sách', children: [
        { label: 'Sách', href: '/admin/sach' },
        { label: 'Tác giả', href: '/admin/tac-gia', icon: 'edit' },
        { label: 'Thể loại', href: '/admin/the-loai', icon: 'grid' },
        { label: 'Nhà xuất bản', href: '/admin/nha-xuat-ban', icon: 'building' },
        { label: 'Phiên bản sách', href: '/admin/phien-ban-sach', icon: 'book' },
        { label: 'Nhà cung cấp', href: '/admin/nha-cung-cap', icon: 'building' }
      ] },
      { label: 'Quản lý kho', children: [
        { label: 'Quản trị kho', href: '/admin/kho' },
        { label: 'Nhập kho', href: '/admin/kho/nhap-kho', icon: 'upload' },
        { label: 'Xuất kho / Điều chuyển kho', href: '/admin/kho/chuyen-kho', icon: 'download' },
        { label: 'Danh sách tồn kho', href: '/admin/kho/ton-kho', icon: 'chart' },
        { label: 'Tổng hợp tồn kho', href: '/admin/kho/ton-kho/tong-hop', icon: 'chart' },
        { label: 'Lịch sử tồn kho', href: '/admin/kho/ton-kho/lich-su', icon: 'file' },
        { label: 'Kiểm kho', href: '/admin/kho/kiem-kho', icon: 'check' }
      ] },
      { label: 'Hội viên', href: '/admin/hoi-vien' },
      { label: 'Phân quyền', href: '/admin/phan-quyen' },
      { label: 'Báo cáo', href: '/admin/bao-cao' },
      { label: 'Cài đặt', href: '/admin/cai-dat' }
    ] },
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
  res.locals.navigation = { ...defaultNavigation, ...(workspace ? { sidebarTitle: workspace.title, sidebarItems: workspace.entries.map(item => taoMucSidebar(item, req)) } : {}), ...(res.locals.navigation || {}) };
  next();
};

export default localsMiddleware;
