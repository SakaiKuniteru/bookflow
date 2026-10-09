function toCamelCase(value) {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), toCamelCase(item)]));
}
const gioiTinhOptions = [
  { value: 'NAM', label: 'Nam' },
  { value: 'NU', label: 'Nữ' },
  { value: 'KHAC', label: 'Khác' },
  { value: 'KHONG_TIET_LO', label: 'Không muốn tiết lộ' }
];
const profileController = {
  render(req, res, next, layout) {
    if (req.userLoadError) return next(req.userLoadError);
    const currentUser = toCamelCase(req.user);
    const rawAccount = currentUser?.taiKhoan;
    if (!rawAccount) return res.redirect('/auth/dang-nhap');
    const account = {
      ...rawAccount,
      hoTen: rawAccount.hoTen ?? '',
      tenDangNhap: rawAccount.tenDangNhap ?? '',
      soDienThoai: rawAccount.soDienThoai ?? '',
      ngaySinh: rawAccount.ngaySinh ?? '',
      gioiTinh: rawAccount.gioiTinh ?? '',
      quocTich: rawAccount.quocTich ?? '',
      danToc: rawAccount.danToc ?? '',
      moTa: rawAccount.moTa ?? '',
      diaChiChiTiet: rawAccount.diaChiChiTiet ?? '',
      quocGia: rawAccount.quocGia ?? '',
      tinhThanhPho: rawAccount.tinhThanhPho ?? '',
      phuongXa: rawAccount.phuongXa ?? '',
      anhDaiDienTepId: rawAccount.anhDaiDienTepId ?? null
    };
    account.initial = account.hoTen.trim().charAt(0).toLocaleUpperCase('vi') || 'A';
    return res.render('shared/thong-tin-ca-nhan', { title: 'Thông tin cá nhân', layout, bodyClass: 'bf-profile-scroll', account, gioiTinhOptions, stylesheets: ['/css/pages/profile.css?v=20261005-2'], scripts: ['/js/page/profile.js?v=20261010-4'] });
  }
};

export default profileController;
