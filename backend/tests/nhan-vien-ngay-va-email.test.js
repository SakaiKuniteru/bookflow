const test = require('node:test');
const assert = require('node:assert/strict');
const { ngayHomNayTaiMuiGio, soNgayLamViec } = require('../src/common/utils/ngay-lich.js');
const { xacDinhSuKienNhanVien } = require('../src/modules/thong-bao/nhan-vien-su-kien.js');
const nhanVienValidation = require('../src/modules/nhan-vien/nhan-vien.validation.js');
const emailTemplate = require('../src/integrations/email-template.js');

test('số ngày làm việc tính cả ngày bắt đầu và không lệch ngày theo múi giờ đơn vị', () => {
    const now = new Date('2026-10-07T17:30:00.000Z');
    assert.equal(ngayHomNayTaiMuiGio('Asia/Ho_Chi_Minh', now), '2026-10-08');
    assert.equal(soNgayLamViec('2026-10-08', null, 'Asia/Ho_Chi_Minh', now), 1);
    assert.equal(soNgayLamViec('2026-10-08', null, 'Asia/Ho_Chi_Minh', new Date('2026-10-08T17:30:00.000Z')), 2);
    assert.equal(soNgayLamViec('2026-99-99', null), null);
});

test('nhân viên đã nghỉ tính đến ngày nghỉ, thiếu ngày vào làm thì không tính', () => {
    assert.equal(soNgayLamViec('2026-10-01', '2026-10-03', 'Asia/Ho_Chi_Minh', new Date('2030-01-01T00:00:00.000Z')), 3);
    assert.equal(soNgayLamViec(null, null, 'Asia/Ho_Chi_Minh', new Date('2026-10-08T00:00:00.000Z')), null);
    assert.equal(soNgayLamViec('2026-10-10', '2026-10-08'), null);
});

test('sinh nhật lặp lại hằng năm, không phụ thuộc năm sinh', () => {
    assert.deepEqual(xacDinhSuKienNhanVien({ ngay_sinh: '1998-10-08', ngay_vao_lam: null }, '2026-10-08'), [{ loai: 'SINH_NHAT', nam: 2026, ngaySinh: '1998-10-08' }]);
});

test('kỷ niệm gửi vào ngày vào làm khi đủ năm và bỏ qua năm đầu tiên', () => {
    assert.deepEqual(xacDinhSuKienNhanVien({ ngay_sinh: null, ngay_vao_lam: '2025-10-08' }, '2026-10-08'), [{ loai: 'KY_NIEM', soNam: 1, ngayVaoLam: '2025-10-08' }]);
    assert.deepEqual(xacDinhSuKienNhanVien({ ngay_sinh: null, ngay_vao_lam: '2026-10-08' }, '2026-10-08'), []);
    assert.deepEqual(xacDinhSuKienNhanVien({ ngay_sinh: null, ngay_vao_lam: null }, '2026-10-08'), []);
    assert.deepEqual(xacDinhSuKienNhanVien({ ngay_sinh: '1998-10-08' }, '2026-99-99'), []);
});

test('hồ sơ nhân viên nhận và xác thực ngày cùng các trường mới', () => {
    const profile = nhanVienValidation.capNhatHopLe({ ngayVaoLam: '2026-10-02', cccdSo: '012345678901', cccdNgayCap: '2020-05-03', cccdNoiCap: 'Cục CSQLHC', lienHeKhanCapHoTen: 'Nguyễn An', lienHeKhanCapQuanHe: 'Mẹ', lienHeKhanCapSoDienThoai: '0912345678', lienHeKhanCapDiaChi: 'Hà Nội', trinhDoHocVan: 'Đại học', chuyenNganh: 'Công nghệ thông tin', truong: 'Đại học A', chungChi: 'AWS', ngoaiNgu: 'Tiếng Anh', kyNang: 'Giao tiếp' });
    assert.equal(profile.ngayVaoLam, '2026-10-02');
    assert.equal(profile.cccdNgayCap, '2020-05-03');
    assert.equal(profile.lienHeKhanCapHoTen, 'Nguyễn An');
    assert.throws(() => nhanVienValidation.capNhatHopLe({ cccdNgayCap: '2026-02-30' }), /không hợp lệ/);
});

test('email chúc mừng dùng HTML thương hiệu và escape tên người nhận', () => {
    const birthday = emailTemplate.taoEmailSuKienNhanVien({ tenNguoiNhan: '<Huy>', loaiSuKien: 'NHAN_VIEN_SINH_NHAT', tieuDe: 'Chúc mừng sinh nhật Huy' });
    const anniversary = emailTemplate.taoEmailSuKienNhanVien({ tenNguoiNhan: 'Huy', loaiSuKien: 'NHAN_VIEN_KY_NIEM', duLieu: { soNam: 3 } });
    assert.match(birthday.html, /BookFlow/);
    assert.match(birthday.html, /&lt;Huy&gt;/);
    assert.match(birthday.html, /HÔM NAY LÀ NGÀY CỦA BẠN/);
    assert.match(anniversary.html, /Chúc mừng 3 năm đồng hành/);
    assert.throws(() => emailTemplate.taoEmailSuKienNhanVien({ tenNguoiNhan: 'Huy', loaiSuKien: 'NHAN_VIEN_KY_NIEM', duLieu: { soNam: 0 } }), /Số năm kỷ niệm/);
});
