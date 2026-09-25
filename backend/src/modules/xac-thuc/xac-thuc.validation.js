const { AppError } = require('../../common/errors/AppError.js');

function loiXacThuc(message = 'Dữ liệu không hợp lệ', status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}

function emailHopLe(email) {
    if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw loiXacThuc('Email không hợp lệ');
    }
    return email.trim().toLowerCase();
}

function dinhDanhHopLe(value) {
    if (typeof value !== 'string' || value.trim().length < 3 || value.trim().length > 254 || /\s/.test(value)) {
        throw loiXacThuc('Tên đăng nhập hoặc email không hợp lệ');
    }
    return value.trim().toLowerCase();
}

function matKhauHopLe(value) {
    if (typeof value !== 'string' || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\r\n]{8,128}$/.test(value)) {
        throw loiXacThuc('Mật khẩu cần 8-128 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt');
    }
    return value;
}

function otpHopLe(value) {
    if (typeof value !== 'string' || !/^\d{6}$/.test(value)) {
        throw loiXacThuc('OTP phải gồm 6 chữ số');
    }
    return value;
}

function tenDangNhapHopLe(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{3,40}$/.test(value)) {
        throw loiXacThuc('Tên đăng nhập không hợp lệ');
    }
    return value.toLowerCase();
}

function maNhanVienHopLe(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{2,40}$/.test(value)) {
        throw loiXacThuc('Mã nhân viên không hợp lệ');
    }
    return value.toUpperCase();
}

module.exports = {
    loiXacThuc,
    emailHopLe,
    dinhDanhHopLe,
    matKhauHopLe,
    otpHopLe,
    tenDangNhapHopLe,
    maNhanVienHopLe
};