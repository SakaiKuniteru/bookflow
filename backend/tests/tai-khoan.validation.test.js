const test = require('node:test');
const assert = require('node:assert/strict');
const { kiemTraCapNhatHoSo, idTepHopLe } = require('../src/modules/tai-khoan/tai-khoan.validation.js');

test('chuẩn hóa họ tên và chỉ chấp nhận trường được phép sửa', () => {
    assert.deepEqual(kiemTraCapNhatHoSo({ ho_ten: '  Nguyễn   Văn An  ' }), { ho_ten: 'Nguyễn Văn An' });
});
test('từ chối họ tên rỗng hoặc ngoài giới hạn với lỗi gắn đúng trường', () => {
    for (const ho_ten of ['', 'A', 'a'.repeat(201)]) {
        assert.throws(() => kiemTraCapNhatHoSo({ ho_ten }), error => error.status === 422 && error.details[0].field === 'ho_ten');
    }
});
test('không cho sửa email, username hoặc phone qua API hồ sơ', () => {
    assert.throws(() => kiemTraCapNhatHoSo({ ho_ten: 'Nguyễn An', email: 'new@example.com' }), error => error.status === 422 && error.details[0].field === 'ho_ten');
});
test('chỉ chấp nhận id file Avatar là số nguyên dương trong miền INTEGER', () => {
    assert.equal(idTepHopLe('123'), 123);
    for (const value of [0, -1, 'abc', 1.5, 2147483648, null]) {
        assert.throws(() => idTepHopLe(value), error => error.status === 422 && error.details[0].field === 'anh_dai_dien_tep_id');
    }
});
