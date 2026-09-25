function doiTenTruong(ten) {
    return ten.replace(/_([a-z0-9])/gi, (_, kyTu) => kyTu.toUpperCase());
}

function chuyenResponseCamelCase(giaTri) {
    if (Array.isArray(giaTri)) return giaTri.map(chuyenResponseCamelCase);
    if (giaTri === null || typeof giaTri !== 'object') return giaTri;
    const prototype = Object.getPrototypeOf(giaTri);
    if (prototype !== Object.prototype && prototype !== null) return giaTri;
    return Object.fromEntries(Object.entries(giaTri).map(([ten, value]) => [doiTenTruong(ten), chuyenResponseCamelCase(value)]));
}

function chuanHoaResponse(req, res, next) {
    const jsonGoc = res.json.bind(res);
    res.json = body => jsonGoc(chuyenResponseCamelCase(body));
    next();
}

module.exports = { chuanHoaResponse };