const { AppError } = require('../../common/errors/AppError.js');
const MAX_ID = 2147483647;
const TRANG_THAI = ['DANG_DUNG', 'TAM_AN', 'NGUNG_DUNG'];
function loiDuLieu(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}
function kiemTraTruong(body, cacTruong) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiDuLieu('Dữ liệu không hợp lệ');
    if (Object.keys(body).some(ten => !cacTruong.includes(ten))) throw loiDuLieu('Dữ liệu có trường không được phép');
}
function chuoiHopLe(value, ten, min, max) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw loiDuLieu(`${ten} không hợp lệ`);
    return value.trim();
}
function idHopLe(value, ten = 'ID') {
    const dungDinhDang = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loiDuLieu(`${ten} không hợp lệ`);
    return id;
}
function soNguyenHopLe(value, ten, min, max) {
    if (!Number.isInteger(value) || value < min || value > max) throw loiDuLieu(`${ten} không hợp lệ`);
    return value;
}
function booleanHopLe(value, ten) {
    if (typeof value !== 'boolean') throw loiDuLieu(`${ten} phải là boolean`);
    return value;
}
function theLoaiMoiHopLe(body) {
    kiemTraTruong(body, ['ma_the_loai', 'ten_the_loai', 'ten_tieng_anh', 'the_loai_cha_id', 'mo_ta', 'duong_dan', 'thu_tu', 'anh_dai_dien_tep_id', 'icon_tep_id', 'hien_thi_menu', 'hien_thi_trang_chu']);
    const ma_the_loai = chuoiHopLe(body.ma_the_loai, 'Mã thể loại', 2, 50).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(ma_the_loai)) throw loiDuLieu('Mã thể loại chỉ được chứa chữ hoa, số, dấu gạch dưới và gạch ngang');
    return {
        ma_the_loai, ten_the_loai: chuoiHopLe(body.ten_the_loai, 'Tên thể loại', 1, 200),
        ten_tieng_anh: body.ten_tieng_anh == null ? null : chuoiHopLe(body.ten_tieng_anh, 'Tên tiếng Anh', 1, 200),
        the_loai_cha_id: body.the_loai_cha_id == null ? null : idHopLe(body.the_loai_cha_id, 'Thể loại cha'),
        mo_ta: body.mo_ta == null ? null : chuoiHopLe(body.mo_ta, 'Mô tả', 1, 20000),
        duong_dan: body.duong_dan == null ? null : chuoiHopLe(body.duong_dan, 'Đường dẫn', 1, 240).toLowerCase(),
        thu_tu: body.thu_tu === undefined ? 0 : soNguyenHopLe(body.thu_tu, 'Thứ tự', 0, MAX_ID),
        anh_dai_dien_tep_id: body.anh_dai_dien_tep_id == null ? null : idHopLe(body.anh_dai_dien_tep_id, 'Ảnh đại diện'),
        icon_tep_id: body.icon_tep_id == null ? null : idHopLe(body.icon_tep_id, 'Icon'),
        hien_thi_menu: body.hien_thi_menu === undefined ? true : booleanHopLe(body.hien_thi_menu, 'Hiển thị menu'),
        hien_thi_trang_chu: body.hien_thi_trang_chu === undefined ? false : booleanHopLe(body.hien_thi_trang_chu, 'Hiển thị trang chủ')
    };
}
function suaTheLoaiHopLe(body) {
    kiemTraTruong(body, ['ten_the_loai', 'ten_tieng_anh', 'the_loai_cha_id', 'mo_ta', 'duong_dan', 'thu_tu', 'anh_dai_dien_tep_id', 'icon_tep_id', 'hien_thi_menu', 'hien_thi_trang_chu']);
    if (!Object.keys(body).length) throw loiDuLieu('Không có dữ liệu cập nhật');
    const duLieu = {};
    if ('ten_the_loai' in body) duLieu.ten_the_loai = chuoiHopLe(body.ten_the_loai, 'Tên thể loại', 1, 200);
    if ('ten_tieng_anh' in body) duLieu.ten_tieng_anh = body.ten_tieng_anh == null ? null : chuoiHopLe(body.ten_tieng_anh, 'Tên tiếng Anh', 1, 200);
    if ('the_loai_cha_id' in body) duLieu.the_loai_cha_id = body.the_loai_cha_id == null ? null : idHopLe(body.the_loai_cha_id, 'Thể loại cha');
    if ('mo_ta' in body) duLieu.mo_ta = body.mo_ta == null ? null : chuoiHopLe(body.mo_ta, 'Mô tả', 1, 20000);
    if ('duong_dan' in body) duLieu.duong_dan = body.duong_dan == null ? null : chuoiHopLe(body.duong_dan, 'Đường dẫn', 1, 240).toLowerCase();
    if ('thu_tu' in body) duLieu.thu_tu = soNguyenHopLe(body.thu_tu, 'Thứ tự', 0, MAX_ID);
    if ('anh_dai_dien_tep_id' in body) duLieu.anh_dai_dien_tep_id = body.anh_dai_dien_tep_id == null ? null : idHopLe(body.anh_dai_dien_tep_id, 'Ảnh đại diện');
    if ('icon_tep_id' in body) duLieu.icon_tep_id = body.icon_tep_id == null ? null : idHopLe(body.icon_tep_id, 'Icon');
    if ('hien_thi_menu' in body) duLieu.hien_thi_menu = booleanHopLe(body.hien_thi_menu, 'Hiển thị menu');
    if ('hien_thi_trang_chu' in body) duLieu.hien_thi_trang_chu = booleanHopLe(body.hien_thi_trang_chu, 'Hiển thị trang chủ');
    return duLieu;
}
function trangThaiHopLe(body) {
    kiemTraTruong(body, ['trang_thai']);
    if (!TRANG_THAI.includes(body.trang_thai)) throw loiDuLieu('Trạng thái thể loại không hợp lệ');
    return body.trang_thai;
}
function boLocHopLe(query = {}) {
    kiemTraTruong(query, ['trang', 'kich_thuoc', 'tu_khoa', 'trang_thai', 'the_loai_cha_id']);
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kich_thuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kich_thuoc > 100 || (trang - 1) * kich_thuoc > MAX_ID) throw loiDuLieu('Phân trang không hợp lệ');
    const trang_thai = query.trang_thai == null ? null : trangThaiHopLe({ trang_thai: query.trang_thai });
    return { trang, kich_thuoc, tu_khoa: query.tu_khoa == null ? '' : chuoiHopLe(query.tu_khoa, 'Từ khóa', 1, 120), trang_thai, the_loai_cha_id: query.the_loai_cha_id == null ? null : idHopLe(query.the_loai_cha_id, 'Thể loại cha') };
}
module.exports = { idHopLe, theLoaiMoiHopLe, suaTheLoaiHopLe, trangThaiHopLe, boLocHopLe };