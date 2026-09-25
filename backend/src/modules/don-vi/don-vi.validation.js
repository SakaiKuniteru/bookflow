const { AppError } = require('../../common/errors/AppError.js');

const TRUONG_TAO = ['ma_don_vi', 'ten_hien_thi', 'email_lien_he', 'ten_phap_ly', 'ma_so_thue', 'so_dien_thoai', 'website', 'mui_gio', 'ngon_ngu'];
const TRUONG_SUA = TRUONG_TAO.filter(ten => ten !== 'ma_don_vi');
const TRUONG_CO_THE_XOA = ['ten_phap_ly', 'ma_so_thue', 'so_dien_thoai', 'website'];

function loiDuLieu(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}

function chuanHoa(body, taoMoi) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiDuLieu('Dữ liệu đơn vị không hợp lệ');
    const truongChoPhep = taoMoi ? TRUONG_TAO : TRUONG_SUA;
    const cacTruong = Object.keys(body);
    if (!cacTruong.length || cacTruong.some(ten => !truongChoPhep.includes(ten))) throw loiDuLieu('Dữ liệu có trường không được phép');
    if (taoMoi && ['ma_don_vi', 'ten_hien_thi', 'email_lien_he'].some(ten => !(ten in body))) throw loiDuLieu('Thiếu thông tin bắt buộc');
    const ketQua = {};
    for (const [ten, giaTri] of Object.entries(body)) {
        if (giaTri === null && TRUONG_CO_THE_XOA.includes(ten)) {
            ketQua[ten] = null;
            continue;
        }
        if (typeof giaTri !== 'string') throw loiDuLieu(`${ten} không hợp lệ`);
        let value = giaTri.trim();
        if (ten === 'ma_don_vi') {
            value = value.toUpperCase();
            if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(value)) throw loiDuLieu('Mã đơn vị phải có 3-40 ký tự, chỉ gồm chữ, số, gạch ngang hoặc gạch dưới');
        }
        if (ten === 'ten_hien_thi' && (value.length < 2 || value.length > 200)) throw loiDuLieu('Tên đơn vị phải có 2-200 ký tự');
        if (ten === 'ten_phap_ly' && (!value || value.length > 255)) throw loiDuLieu('Tên pháp lý không hợp lệ');
        if (ten === 'ma_so_thue' && (!value || value.length > 30 || !/^[A-Za-z0-9-]+$/.test(value))) throw loiDuLieu('Mã số thuế không hợp lệ');
        if (ten === 'email_lien_he') {
            value = value.toLowerCase();
            if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw loiDuLieu('Email liên hệ không hợp lệ');
        }
        if (ten === 'so_dien_thoai' && !/^[0-9+(). -]{9,30}$/.test(value)) throw loiDuLieu('Số điện thoại không hợp lệ');
        if (ten === 'website') {
            try {
                const url = new URL(value);
                if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error();
                value = url.toString();
            } catch {
                throw loiDuLieu('Website phải là URL HTTPS hợp lệ');
            }
        }
        if (ten === 'mui_gio') {
            try { new Intl.DateTimeFormat('en', { timeZone: value }); }
            catch { throw loiDuLieu('Múi giờ không hợp lệ'); }
        }
        if (ten === 'ngon_ngu' && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(value)) throw loiDuLieu('Ngôn ngữ không hợp lệ');
        ketQua[ten] = value;
    }
    return ketQua;
}

function donViMoiHopLe(body) {
    return chuanHoa(body, true);
}

function capNhatDonViHopLe(body) {
    return chuanHoa(body, false);
}

module.exports = { donViMoiHopLe, capNhatDonViHopLe };