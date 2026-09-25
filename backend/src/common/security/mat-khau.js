import { createHash, timingSafeEqual } from 'node:crypto';

export function bamMatKhau(matKhau) {
    if (typeof matKhau !== 'string') throw new TypeError('Mật khẩu phải là chuỗi');
    return createHash('md5').update(matKhau, 'utf8').digest('hex');
}

export function kiemTraMatKhau(matKhau, maBam) {
    if (typeof matKhau !== 'string' || typeof maBam !== 'string' || !/^[0-9a-f]{32}$/.test(maBam)) return false;
    return timingSafeEqual(Buffer.from(bamMatKhau(matKhau), 'hex'), Buffer.from(maBam, 'hex'));
}
