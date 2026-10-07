const test = require('node:test');
const assert = require('node:assert/strict');
const { kiemTraCapNhatHoSo, idTepHopLe } = require('../src/modules/tai-khoan/tai-khoan.validation.js');
const { chuyenRequestSnakeCase } = require('../src/common/middlewares/request-snake-case.js');

test('nhận payload hồ sơ camelCase qua middleware và chuẩn hóa họ tên', () => {
    const payload = chuyenRequestSnakeCase({ hoTen: '  Nguyễn   Văn An  ', ngaySinh: '2001-01-01', gioiTinh: 'NAM', quocTich: 'VN', danToc: '01', moTa: null, diaChiChiTiet: null, quocGia: 'VN', tinhThanhPho: null, phuongXa: null });
    assert.deepEqual(kiemTraCapNhatHoSo(payload), { ho_ten: 'Nguyễn Văn An', ngay_sinh: '2001-01-01', gioi_tinh: 'NAM', quoc_tich: 'VN', dan_toc: '01', dia_chi_chi_tiet: null, quoc_gia: 'VN', tinh_thanh_pho: null, phuong_xa: null, mo_ta: null });
});
test('từ chối họ tên rỗng hoặc ngoài giới hạn với lỗi gắn đúng trường', () => {
    for (const ho_ten of ['', 'A', 'a'.repeat(201)]) {
        assert.throws(() => kiemTraCapNhatHoSo({ ho_ten }), error => error.status === 422 && error.details[0].field === 'ho_ten');
    }
});
test('không cho sửa email, username hoặc phone qua API hồ sơ', () => {
    assert.throws(() => kiemTraCapNhatHoSo({ ho_ten: 'Nguyễn An', email: 'new@example.com' }), error => error.status === 422 && error.details[0].field === 'email' && error.message.includes('email'));
});
test('chỉ chấp nhận id file Avatar là số nguyên dương trong miền INTEGER', () => {
    assert.equal(idTepHopLe('123'), 123);
    for (const value of [0, -1, 'abc', 1.5, 2147483648, null]) {
        assert.throws(() => idTepHopLe(value), error => error.status === 422 && error.details[0].field === 'anh_dai_dien_tep_id');
    }
});
