import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'express-handlebars';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const view = path.join(base, 'views/shared/thong-tin-ca-nhan.hbs');
async function renderProfile(account) {
    const handlebars = create({ extname: '.hbs', partialsDir: path.join(base, 'views/partials'), helpers: { eq: (left, right) => left === right } });
    return handlebars.renderView(view, { layout: false, account });
}
test('render thông tin hồ sơ bằng form components và khóa các định danh xác thực OTP', async () => {
    const html = await renderProfile({ ho_ten: 'Nguyễn An', ten_dang_nhap: 'nguyena', email: 'an@example.com', so_dien_thoai: '0912345678' });
    assert.match(html, /Thông tin tài khoản/);
    assert.match(html, /name="ho_ten"/);
    assert.match(html, /name="ten_dang_nhap"[\s\S]*?disabled/);
    assert.match(html, /name="email"[\s\S]*?disabled/);
    assert.match(html, /name="so_dien_thoai"[\s\S]*?disabled/);
    assert.match(html, /data-avatar-save/);
});
test('khi không có ảnh thì render chữ cái đại diện và không hiện nút tải ảnh', async () => {
    const html = await renderProfile({ ho_ten: 'Huy' });
    assert.match(html, /data-bf-profile-avatar-fallback[^>]*>H/);
    assert.match(html, /<button[^>]*disabled>Tải ảnh<\/button>/);
});
