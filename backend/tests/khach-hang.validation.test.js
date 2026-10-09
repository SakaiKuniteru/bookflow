const test = require('node:test');
const assert = require('node:assert/strict');
const khachHangValidation = require('../src/modules/khach-hang/khach-hang.validation.js');

test('tạo khách hàng gom lỗi nhập liệu theo đúng từng trường', () => {
    const { details } = khachHangValidation.kiemTraKhachHangMoi({ ho_ten: '', ten_dang_nhap: 'ab', email: 'sai-email', so_dien_thoai: 'sai', ngay_sinh: '2026-13-40' });
    const fields = new Set(details.map(item => item.field));
    for (const field of ['ho_ten', 'ten_dang_nhap', 'email', 'so_dien_thoai', 'ngay_sinh']) assert.ok(fields.has(field), `Thiếu lỗi trường ${field}`);
});

test('sửa khách hàng trả đồng thời lỗi theo trường và không cho xóa email tài khoản', () => {
    const { details } = khachHangValidation.kiemTraKhachHangSua({ ho_ten: '', email: '', so_dien_thoai: 'sai', ngay_sinh: 'sai-ngay', quoc_tich: 123 });
    const fields = new Set(details.map(item => item.field));
    for (const field of ['ho_ten', 'email', 'so_dien_thoai', 'ngay_sinh', 'quoc_tich']) assert.ok(fields.has(field), `Thiếu lỗi trường ${field}`);
});
