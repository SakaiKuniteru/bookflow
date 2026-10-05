import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvatarCropRect } from '../../src/public/js/page/profile-crop.js';

test('ảnh ngang 500x100 được cover hình vuông mà không méo', () => {
    const crop = getAvatarCropRect(500, 100, 100);
    assert.deepEqual(crop, { x: -200, y: 0, width: 500, height: 100 });
});
test('ảnh dọc 100x500 được cover hình vuông mà không méo', () => {
    const crop = getAvatarCropRect(100, 500, 100);
    assert.deepEqual(crop, { x: 0, y: -200, width: 100, height: 500 });
});
test('zoom và kéo ảnh thay đổi vùng crop nhưng không để lộ nền trống', () => {
    const crop = getAvatarCropRect(500, 100, 100, 2, 10000, -10000);
    assert.equal(crop.width, 1000);
    assert.equal(crop.height, 200);
    assert.equal(crop.x, 0);
    assert.equal(crop.y + crop.height, 100);
});
test('từ chối kích thước ảnh hoặc mức zoom không hợp lệ', () => {
    assert.throws(() => getAvatarCropRect(0, 100, 100), RangeError);
    assert.throws(() => getAvatarCropRect(100, 100, 100, .5), RangeError);
});
