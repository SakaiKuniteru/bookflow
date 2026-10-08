function ngayISO(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) return null;
    const date = new Date(`${match[1]}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === match[1] ? match[1] : null;
}

function ngayHomNayTaiMuiGio(muiGio = 'Asia/Ho_Chi_Minh', thoiDiem = new Date()) {
    let formatter;
    try { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: muiGio, year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { formatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    const parts = formatter.formatToParts(thoiDiem);
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function soNgayLamViec(ngayVaoLam, ngayKetThuc, muiGio = 'Asia/Ho_Chi_Minh', thoiDiem = new Date()) {
    const batDau = ngayISO(ngayVaoLam);
    const ketThuc = ngayISO(ngayKetThuc) || ngayHomNayTaiMuiGio(muiGio, thoiDiem);
    if (!batDau || !/^\d{4}-\d{2}-\d{2}$/.test(ketThuc)) return null;
    const [namBatDau, thangBatDau, ngayBatDau] = batDau.split('-').map(Number);
    const [namKetThuc, thangKetThuc, ngayKetThucISO] = ketThuc.split('-').map(Number);
    const mocBatDau = Date.UTC(namBatDau, thangBatDau - 1, ngayBatDau);
    const mocKetThuc = Date.UTC(namKetThuc, thangKetThuc - 1, ngayKetThucISO);
    if (new Date(mocBatDau).toISOString().slice(0, 10) !== batDau || new Date(mocKetThuc).toISOString().slice(0, 10) !== ketThuc || mocKetThuc < mocBatDau) return null;
    return Math.floor((mocKetThuc - mocBatDau) / 86400000) + 1;
}

module.exports = { ngayISO, ngayHomNayTaiMuiGio, soNgayLamViec };
