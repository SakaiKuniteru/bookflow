const { AppError } = require('../../common/errors/AppError.js');
async function taoYeuCauQR({ giaoDich,phuongThuc,taiKhoanNhan }) {
    if (!giaoDich || phuongThuc.loai !== 'QR' || !taiKhoanNhan) throw new TypeError('Dữ liệu yêu cầu QR không hợp lệ');
    return { tich_hop_ngan_hang: false,trang_thai: 'CHO_TICH_HOP',ma_giao_dich: giaoDich.ma_giao_dich,so_tien: giaoDich.so_tien,noi_dung: `BookFlow ${giaoDich.ma_giao_dich}`,qr_payload: null,qr_image_url: null };
}
async function xacMinhSuKien({ nhaCungCap,headers,rawBody }) {
    if (!nhaCungCap || !headers || !Buffer.isBuffer(rawBody)) throw new AppError({ code: 'INVALID_QR_WEBHOOK',message: 'Thiếu dữ liệu xác thực webhook ngân hàng',status: 400 });
    throw new AppError({ code: 'QR_PROVIDER_NOT_CONFIGURED',message: 'Chưa kết nối và xác minh chữ ký ngân hàng; không được xác nhận thanh toán QR',status: 503 });
}
module.exports = { taoYeuCauQR,xacMinhSuKien };