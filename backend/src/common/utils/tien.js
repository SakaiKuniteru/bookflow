const HE_SO = 1000n;
function tachTien(value) {
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) throw new TypeError('Tiền dạng Number chỉ chấp nhận số nguyên an toàn; tiền thập phân phải gửi dạng chuỗi');
        value = String(value);
    }
    if (typeof value === 'bigint') value = value.toString();
    if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) throw new TypeError('Số tiền không hợp lệ');
    const s = value.trim();
    const am = s.startsWith('-');
    const [nguyen,le = ''] = (am ? s.slice(1) : s).split('.');
    const baSo = (le + '000').slice(0,3);
    const so = BigInt(nguyen) * HE_SO + BigInt(baSo);
    const lamTron = le.length > 3 && le[3] >= '5' ? 1n : 0n;
    return (am ? -1n : 1n) * (so + lamTron);
}
function hienThi(value) {
    const so = typeof value === 'bigint' ? value : BigInt(value);
    const am = so < 0n ? '-' : '';
    const duong = so < 0n ? -so : so;
    const le = String(duong % HE_SO).padStart(3,'0').replace(/0+$/,'');
    return am + String(duong / HE_SO) + (le ? `.${le}` : '');
}
function lamTronTien(value) {
    return hienThi(tachTien(value));
}
function congTien(...values) {
    return hienThi(values.reduce((tong,value) => tong + tachTien(value),0n));
}
function truTien(a,b) {
    return hienThi(tachTien(a) - tachTien(b));
}
function nhanTien(a,b) {
    if (!Number.isSafeInteger(b)) throw new TypeError('Hệ số nhân phải là số nguyên an toàn');
    return hienThi(tachTien(a) * BigInt(b));
}
function chiaTien(a,b) {
    if (!Number.isSafeInteger(b) || b === 0) throw new TypeError('Số chia không hợp lệ');
    const so = tachTien(a);
    const chia = BigInt(b);
    const am = (so < 0n) !== (chia < 0n);
    const tu = so < 0n ? -so : so;
    const mau = chia < 0n ? -chia : chia;
    const ketQua = (tu + mau / 2n) / mau;
    return hienThi(am ? -ketQua : ketQua);
}
function phanTramTien(a,phanTram) {
    const phanTramPhanNghin = tachTien(phanTram);
    const tu = tachTien(a) * phanTramPhanNghin;
    const am = tu < 0n;
    const duong = am ? -tu : tu;
    const ketQua = (duong + 50000n) / 100000n;
    return hienThi(am ? -ketQua : ketQua);
}
function soSanhTien(a,b) {
    const x = tachTien(a);
    const y = tachTien(b);
    return x === y ? 0 : x > y ? 1 : -1;
}
module.exports = { lamTronTien,congTien,truTien,nhanTien,chiaTien,phanTramTien,soSanhTien };