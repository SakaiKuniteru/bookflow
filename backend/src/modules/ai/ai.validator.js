const { AppError } = require('../../common/errors/AppError.js');
const { AI_LOAI_YEU_CAU, AI_LOAI_PHAN_TICH, AI_MAX } = require('./ai.constant.js');

function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}

function chuoiHopLe(value, tenTruong, batBuoc = false, doDaiToiDa = AI_MAX.DO_DAI_CAU_HOI) {
    if (value == null || String(value).trim() === '') {
        if (batBuoc) throw loi(`Thiếu ${tenTruong}`);
        return null;
    }
    const ketQua = String(value).trim();
    if (ketQua.length > doDaiToiDa) throw loi(`${tenTruong} vượt quá ${doDaiToiDa} ký tự`);
    return ketQua;
}

function idHopLe(value, tenTruong) {
    if (value == null || value === '') return null;
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw loi(`${tenTruong} không hợp lệ`);
    return id;
}

function soNguyenHopLe(value, tenTruong, macDinh = null, min = 1, max = 1000) {
    if (value == null || value === '') return macDinh;
    const so = Number(value);
    if (!Number.isInteger(so) || so < min || so > max) throw loi(`${tenTruong} không hợp lệ`);
    return so;
}

function doiTuongHopLe(value) {
    if (value == null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) throw loi('Đối tượng dữ liệu không hợp lệ');
    return value;
}

function duLieuChatHopLe(body = {}) {
    return {
        cau_hoi: chuoiHopLe(body.cau_hoi ?? body.cauHoi, 'câu hỏi', true),
        lich_su: Array.isArray(body.lich_su ?? body.lichSu) ? (body.lich_su ?? body.lichSu).slice(-20) : [],
        doi_tuong: doiTuongHopLe(body.doi_tuong ?? body.doiTuong),
        assistant_type: chuoiHopLe(body.assistant_type ?? body.assistantType, 'assistant_type') || 'BOOK_ADVISOR',
        conversation_id: idHopLe(body.conversation_id ?? body.conversationId, 'conversation_id'),
        yeu_cau_id: chuoiHopLe(body.yeu_cau_id ?? body.yeuCauId, 'mã yêu cầu')
    };
}

function duLieuSearchHopLe(body = {}) {
    return {
        cau_hoi: chuoiHopLe(body.cau_hoi ?? body.cauHoi, 'câu hỏi tìm kiếm', true),
        gioi_han: soNguyenHopLe(body.gioi_han ?? body.gioiHan, 'giới hạn kết quả', AI_MAX.SO_KET_QUA_SEARCH, 1, AI_MAX.SO_KET_QUA_SEARCH)
    };
}

function duLieuGoiYSachHopLe(body = {}) {
    return {
        sach_id: idHopLe(body.sach_id ?? body.sachId, 'Sách'),
        cau_hoi: chuoiHopLe(body.cau_hoi ?? body.cauHoi, 'yêu cầu gợi ý'),
        so_luong: soNguyenHopLe(body.so_luong ?? body.soLuong, 'số lượng gợi ý', 5, 1, AI_MAX.SO_KET_QUA_GOI_Y)
    };
}

function duLieuPhanTichHopLe(body = {}) {
    const loai = chuoiHopLe(body.loai ?? body.loaiPhanTich, 'loại phân tích', true);
    if (!Object.values(AI_LOAI_PHAN_TICH).includes(loai)) throw loi('Loại phân tích không được hỗ trợ');
    return {
        loai,
        cau_hoi: chuoiHopLe(body.cau_hoi ?? body.cauHoi, 'câu hỏi phân tích'),
        tu_ngay: body.tu_ngay ?? body.tuNgay ?? null,
        den_ngay: body.den_ngay ?? body.denNgay ?? null,
        chi_nhanh_id: idHopLe(body.chi_nhanh_id ?? body.chiNhanhId, 'Chi nhánh'),
        context: doiTuongHopLe(body.context),
        sach_id: idHopLe(body.sach_id ?? body.sachId, 'Sách')
    };
}

function kiemTraNgay(tuNgay, denNgay) {
    if (!tuNgay && !denNgay) return;
    if (!tuNgay || !denNgay) throw loi('Phải truyền đồng thời từ ngày và đến ngày');
    const tu = new Date(tuNgay);
    const den = new Date(denNgay);
    if (Number.isNaN(tu.getTime()) || Number.isNaN(den.getTime())) throw loi('Khoảng thời gian không hợp lệ');
    if (tu > den) throw loi('Từ ngày phải nhỏ hơn hoặc bằng đến ngày');
}

function duLieuPhanTichDaHopLe(body = {}) {
    const data = duLieuPhanTichHopLe(body);
    kiemTraNgay(data.tu_ngay, data.den_ngay);
    return data;
}

function idHopLePath(value, tenTruong = 'ID') {
    return idHopLe(value, tenTruong);
}

module.exports = {
    duLieuChatHopLe,
    duLieuSearchHopLe,
    duLieuGoiYSachHopLe,
    duLieuPhanTichHopLe: duLieuPhanTichDaHopLe,
    idHopLe: idHopLePath
};