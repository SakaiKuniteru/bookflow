const test = require('node:test');
const assert = require('node:assert/strict');
const taiKhoanRepository = require('../src/modules/tai-khoan/tai-khoan.repository.js');
const transactionPath = require.resolve('../src/database/transaction.js');
const servicePath = require.resolve('../src/modules/tai-khoan/tai-khoan.service.js');
const previousTransaction = require.cache[transactionPath];
require.cache[transactionPath] = { id: transactionPath, filename: transactionPath, loaded: true, exports: { trongGiaoDich: callback => callback({ query: async () => ({}) }) } };
delete require.cache[servicePath];
const taiKhoanService = require(servicePath);
test('API hồ sơ chỉ cập nhật họ tên rồi trả dữ liệu mới', async () => {
    const original = taiKhoanRepository.capNhatHoSo;
    taiKhoanRepository.capNhatHoSo = async (id, hoSo) => ({ id, ho_ten: hoSo.ho_ten });
    try { assert.deepEqual(await taiKhoanService.capNhatHoSoTaiKhoan(8, { ho_ten: '  Hà   An ' }), { id: 8, hoTen: 'Hà An' }); }
    finally { taiKhoanRepository.capNhatHoSo = original; }
});
test('API Avatar từ chối file không thuộc tài khoản và không cập nhật liên kết', async () => {
    const originalCheck = taiKhoanRepository.anhDaiDienThuocTaiKhoan;
    const originalUpdate = taiKhoanRepository.capNhatAnhDaiDien;
    let updated = false;
    taiKhoanRepository.anhDaiDienThuocTaiKhoan = async () => false;
    taiKhoanRepository.capNhatAnhDaiDien = async () => { updated = true; };
    try {
        await assert.rejects(taiKhoanService.capNhatAnhDaiDien(8, { anh_dai_dien_tep_id: 99 }), error => error.status === 422 && error.code === 'AVATAR_FILE_FORBIDDEN');
        assert.equal(updated, false);
    } finally {
        taiKhoanRepository.anhDaiDienThuocTaiKhoan = originalCheck;
        taiKhoanRepository.capNhatAnhDaiDien = originalUpdate;
    }
});
test('API Avatar chỉ gắn file riêng đã xác minh của chính tài khoản', async () => {
    const originalCheck = taiKhoanRepository.anhDaiDienThuocTaiKhoan;
    const originalUpdate = taiKhoanRepository.capNhatAnhDaiDien;
    taiKhoanRepository.anhDaiDienThuocTaiKhoan = async (accountId, fileId) => accountId === 8 && fileId === 99;
    taiKhoanRepository.capNhatAnhDaiDien = async (accountId, fileId) => ({ id: accountId, anh_dai_dien_tep_id: fileId });
    try { assert.deepEqual(await taiKhoanService.capNhatAnhDaiDien(8, { anh_dai_dien_tep_id: 99 }), { id: 8, anhDaiDienTepId: 99 }); }
    finally {
        taiKhoanRepository.anhDaiDienThuocTaiKhoan = originalCheck;
        taiKhoanRepository.capNhatAnhDaiDien = originalUpdate;
    }
});
test.after(() => {
    delete require.cache[servicePath];
    if (previousTransaction) require.cache[transactionPath] = previousTransaction;
    else delete require.cache[transactionPath];
});
