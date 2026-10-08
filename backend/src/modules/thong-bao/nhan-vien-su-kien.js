const { ngayISO } = require('../../common/utils/ngay-lich.js');

function xacDinhSuKienNhanVien(employee, homNay) {
    const ngaySinh = ngayISO(employee.ngay_sinh);
    const ngayVaoLam = ngayISO(employee.ngay_vao_lam);
    const nam = Number(homNay?.slice(0, 4));
    const suKien = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(homNay ?? '') || ngayISO(homNay) !== homNay || !Number.isInteger(nam)) return suKien;
    if (ngaySinh && ngaySinh.slice(5) === homNay.slice(5)) suKien.push({ loai: 'SINH_NHAT', nam, ngaySinh });
    if (ngayVaoLam && ngayVaoLam.slice(5) === homNay.slice(5)) {
        const soNam = nam - Number(ngayVaoLam.slice(0, 4));
        if (soNam >= 1) suKien.push({ loai: 'KY_NIEM', soNam, ngayVaoLam });
    }
    return suKien;
}

module.exports = { xacDinhSuKienNhanVien };
