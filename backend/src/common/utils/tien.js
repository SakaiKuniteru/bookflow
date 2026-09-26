const HE_SO = 1000n;
function phanNghin(value) {
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) throw new TypeError('Số tiền dạng Number phải là số nguyên an toàn; số thập phân truyền bằng chuỗi');
        value = String(value);
    }
    if (typeof value === 'bigint') value = value.toString();
    if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) throw new TypeError('Số tiền không hợp lệ');
    const chuoi = value.trim();
    const am = chuoi[0] === '-';
    const [nguyen,le = ''] = (am ? chuoi.slice(1) : chuoi).split('.');
    const so = BigInt(nguyen) * HE_SO + BigInt((le + '000').slice(0,3)) + (le.length > 3 && le[3] >= '5' ? 1n : 0n);
    return am ? -so : so;
}
function hienThiTien(so) {
    const am = so < 0n ? '-' : '';
    const triTuyetDoi = so < 0n ? -so : so;
    const le = String(triTuyetDoi % HE_SO).padStart(3,'0').replace(/0+$/,'');
    return am + String(triTuyetDoi / HE_SO) + (le ? '.' + le : '');
}
function lamTronTien(value) { return hienThiTien(phanNghin(value)); }
function congTien(...values) { return hienThiTien(values.reduce((tong,value) => tong + phanNghin(value),0n)); }
function truTien(a,b) { return hienThiTien(phanNghin(a) - phanNghin(b)); }
function nhanTien(a,b) {
    if (!Number.isSafeInteger(b)) throw new TypeError('Hệ số nhân phải là số nguyên an toàn');
    return hienThiTien(phanNghin(a) * BigInt(b));
}
function chiaTien(a,b) {
    if (!Number.isSafeInteger(b) || b === 0) throw new TypeError('Số chia không hợp lệ');
    const tu = phanNghin(a);
    const mau = BigInt(b);
    const am = (tu < 0n) !== (mau < 0n);
    const duong = tu < 0n ? -tu : tu;
    const chia = mau < 0n ? -mau : mau;
    const ketQua = (duong + chia / 2n) / chia;
    return hienThiTien(am ? -ketQua : ketQua);
}
function phanTramTien(tien,phanTram) {
    const tu = phanNghin(tien) * phanNghin(phanTram);
    const am = tu < 0n;
    const duong = am ? -tu : tu;
    const ketQua = (duong + 50000n) / 100000n;
    return hienThiTien(am ? -ketQua : ketQua);
}
function soSanhTien(a,b) {
    const x = phanNghin(a);
    const y = phanNghin(b);
    return x === y ? 0 : x > y ? 1 : -1;
}
module.exports = { lamTronTien,congTien,truTien,nhanTien,chiaTien,phanTramTien,soSanhTien };