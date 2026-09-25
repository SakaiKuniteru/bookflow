const { AppError } = require('../errors/AppError.js');
const tokenService = require('../security/token.js');
const xacThucRepository = require('../../modules/xac-thuc/xac-thuc.repository.js');

function loiChuaDangNhap() {
    return new AppError({ code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập', status: 401 });
}

async function authenticate(req, _res, next) {
    try {
        const authorization = req.get('Authorization');
        const ketQua = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/i.exec(authorization) : null;
        if (!ketQua) throw loiChuaDangNhap();
        const token = await tokenService.xacMinhAccessToken(ketQua[1]);
        const phien = await xacThucRepository.layPhienTheoId(token.phienId, token.taiKhoanId);
        if (!phien || Number(phien.phien_ban_xac_thuc) !== token.phienBan) {
            throw new AppError({ code: 'SESSION_EXPIRED', message: 'Phiên đăng nhập không còn hợp lệ', status: 401 });
        }
        req.auth = {
            phienId: phien.id,
            taiKhoanId: phien.tai_khoan_id,
            donViId: phien.don_vi_dang_chon_id ?? null,
            chiNhanhId: phien.chi_nhanh_dang_chon_id ?? null,
            email: phien.email
        };
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { authenticate };