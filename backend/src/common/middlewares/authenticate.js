import { createHash, timingSafeEqual } from 'node:crypto';
import { layPhienTheoToken } from '../../modules/xac-thuc/xac-thuc.repository.js';
import { AppError } from '../errors/AppError.js';

const TOKEN_HOP_LE = /^[A-Za-z0-9_-]{43}$/;
const MA_BAM_HOP_LE = /^[0-9a-f]{64}$/i;

function bamToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function loiChuaDangNhap() {
    return new AppError({
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập',
        status: 401
    });
}

function loiPhienHetHan() {
    return new AppError({
        code: 'SESSION_EXPIRED',
        message: 'Phiên đăng nhập không còn hợp lệ',
        status: 401
    });
}

function loiCsrf() {
    return new AppError({
        code: 'CSRF_FAILED',
        message: 'Yêu cầu xác minh CSRF không hợp lệ',
        status: 403
    });
}

export async function authenticate(req, _res, next) {
    try {
        const token = req.cookies?.bookflow_sid;

        if (typeof token !== 'string' || !TOKEN_HOP_LE.test(token)) {
            throw loiChuaDangNhap();
        }

        const phien = await layPhienTheoToken(bamToken(token));
        if (!phien || typeof phien.csrf_token_bam !== 'string') {
            throw loiPhienHetHan();
        }

        const csrfBam = phien.csrf_token_bam.trim();
        if (!MA_BAM_HOP_LE.test(csrfBam)) {
            throw loiPhienHetHan();
        }

        req.auth = {
            phienId: phien.id,
            taiKhoanId: phien.tai_khoan_id,
            donViId: phien.don_vi_dang_chon_id ?? null,
            chiNhanhId: phien.chi_nhanh_dang_chon_id ?? null,
            csrfBam,
            email: phien.email
        };

        next();
    } catch (error) {
        next(error);
    }
}

export function kiemTraCsrf(req, _res, next) {
    try {
        if (!req.auth?.phienId || !req.auth?.csrfBam) {
            throw loiChuaDangNhap();
        }

        const tokenHeader = req.get('X-CSRF-Token');
        const tokenCookie = req.cookies?.bookflow_csrf;

        if (
            typeof tokenHeader !== 'string'
            || typeof tokenCookie !== 'string'
            || !TOKEN_HOP_LE.test(tokenHeader)
            || !TOKEN_HOP_LE.test(tokenCookie)
            || !MA_BAM_HOP_LE.test(req.auth.csrfBam)
        ) {
            throw loiCsrf();
        }

        const header = Buffer.from(tokenHeader, 'utf8');
        const cookie = Buffer.from(tokenCookie, 'utf8');

        if (header.length !== cookie.length || !timingSafeEqual(header, cookie)) {
            throw loiCsrf();
        }

        const maBamHeader = Buffer.from(bamToken(tokenHeader), 'hex');
        const maBamPhien = Buffer.from(req.auth.csrfBam, 'hex');

        if (
            maBamHeader.length !== maBamPhien.length
            || !timingSafeEqual(maBamHeader, maBamPhien)
        ) {
            throw loiCsrf();
        }

        next();
    } catch (error) {
        next(error);
    }
}