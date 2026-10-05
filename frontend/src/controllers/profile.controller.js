const gioiTinhOptions = [
  { value: 'NAM', label: 'Nam' },
  { value: 'NU', label: 'Nữ' },
  { value: 'KHAC', label: 'Khác' },
  { value: 'KHONG_TIET_LO', label: 'Không muốn tiết lộ' }
];
const profileController = {
  render(req, res, next, layout) {
    if (req.userLoadError) return next(req.userLoadError);
    const rawAccount = req.user?.tai_khoan || req.user?.taiKhoan;
    if (!rawAccount) return res.redirect('/auth/dang-nhap');
    const account = {
      ...rawAccount,
      ho_ten: rawAccount.ho_ten ?? rawAccount.hoTen ?? '',
      ten_dang_nhap: rawAccount.ten_dang_nhap ?? rawAccount.tenDangNhap ?? '',
      so_dien_thoai: rawAccount.so_dien_thoai ?? rawAccount.soDienThoai ?? '',
      ngay_sinh: rawAccount.ngay_sinh ?? rawAccount.ngaySinh ?? '',
      gioi_tinh: rawAccount.gioi_tinh ?? rawAccount.gioiTinh ?? '',
      quoc_tich: rawAccount.quoc_tich ?? rawAccount.quocTich ?? '',
      dan_toc: rawAccount.dan_toc ?? rawAccount.danToc ?? '',
      mo_ta: rawAccount.mo_ta ?? rawAccount.moTa ?? '',
      dia_chi_chi_tiet: rawAccount.dia_chi_chi_tiet ?? rawAccount.diaChiChiTiet ?? '',
      quoc_gia: rawAccount.quoc_gia ?? rawAccount.quocGia ?? '',
      tinh_thanh_pho: rawAccount.tinh_thanh_pho ?? rawAccount.tinhThanhPho ?? '',
      phuong_xa: rawAccount.phuong_xa ?? rawAccount.phuongXa ?? '',
      anh_dai_dien_tep_id: rawAccount.anh_dai_dien_tep_id ?? rawAccount.anhDaiDienTepId ?? null
    };
    account.initial = account.ho_ten.trim().charAt(0).toLocaleUpperCase('vi') || 'A';
    return res.render('shared/thong-tin-ca-nhan', { title: 'Thông tin cá nhân', layout, account, gioiTinhOptions, stylesheets: ['/css/pages/profile.css?v=20261005-2'], scripts: ['/js/page/profile.js?v=20261005-3'] });
  }
};

export default profileController;
