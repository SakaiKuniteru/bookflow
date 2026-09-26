const { AppError } = require('../../common/errors/AppError.js');

function loi(message) {
    return new AppError({ code: 'INVALID_FILE', message, status: 422 });
}
function idHopLe(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw loi('ID file không hợp lệ');
    return id;
}
function duLieuUploadHopLe(body, files) {
    if (!Array.isArray(files) || !files.length || files.length > 10) throw loi('Phải chọn từ 1 đến 10 file');
    if (!body || typeof body !== 'object' || Object.keys(body).some(ten => !['pham_vi_so_huu', 'loai_tep'].includes(ten))) throw loi('Dữ liệu upload không hợp lệ');
    const phamVi = body.pham_vi_so_huu;
    const loaiTep = body.loai_tep;
    if (!['CA_NHAN', 'DON_VI'].includes(phamVi)) throw loi('Phạm vi sở hữu file không hợp lệ');
    if (!['ANH_BIA', 'ANH_DAI_DIEN', 'LOGO', 'CHUNG_TU', 'MINH_CHUNG', 'KHAC'].includes(loaiTep)) throw loi('Loại file không hợp lệ');
    if (phamVi === 'CA_NHAN' && loaiTep !== 'ANH_DAI_DIEN') throw loi('Upload cá nhân hiện chỉ hỗ trợ ảnh đại diện');
    if (phamVi === 'DON_VI' && loaiTep === 'ANH_DAI_DIEN') throw loi('Ảnh đại diện cá nhân phải thuộc tài khoản');
    return { phamVi, loaiTep };
}
module.exports = { loi, idHopLe, duLieuUploadHopLe };