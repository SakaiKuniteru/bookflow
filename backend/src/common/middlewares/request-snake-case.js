function doiTenTruong(ten) {
    return ten.replace(/[A-Z]/g, kyTu => `_${kyTu.toLowerCase()}`);
}

function chuyenRequestSnakeCase(giaTri) {
    if (Array.isArray(giaTri)) return giaTri.map(chuyenRequestSnakeCase);
    if (giaTri === null || typeof giaTri !== 'object' || giaTri instanceof Date || Buffer.isBuffer(giaTri)) return giaTri;
    const prototype = Object.getPrototypeOf(giaTri);
    if (prototype !== Object.prototype && prototype !== null) return giaTri;
    return Object.fromEntries(Object.entries(giaTri).map(([ten, value]) => [doiTenTruong(ten), chuyenRequestSnakeCase(value)]));
}

function chuanHoaRequestSnakeCase(req, _res, next) {
    if (req.body && typeof req.body === 'object') req.body = chuyenRequestSnakeCase(req.body);
    const url = new URL(req.url, 'http://localhost');
    const query = new URLSearchParams();
    for (const [ten, value] of url.searchParams) query.append(doiTenTruong(ten), value);
    req.url = `${url.pathname}${query.size ? `?${query.toString()}` : ''}`;
    next();
}

module.exports = { doiTenTruong, chuyenRequestSnakeCase, chuanHoaRequestSnakeCase };
