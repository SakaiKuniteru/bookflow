const service = require('./thong-bao.service.js');

function camel(value) {
    if (Array.isArray(value)) return value.map(camel);
    if (value === null || typeof value !== 'object' || value instanceof Date) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), camel(item)]));
}

function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, requestId: req.requestId, data: camel(data) });
}

const xuLy = (fn, status = 200) => async (req, res, next) => {
    try { return tra(req, res, await fn(req), status); }
    catch (error) { next(error); }
};

module.exports = {
    danhSach: xuLy(req => service.danhSach(req.auth, req.query)),
    chiTiet: xuLy(req => service.chiTiet(req.auth, req.params.thongBaoId)),
    danhDauDaDoc: xuLy(req => service.danhDauDaDoc(req.auth, req.params.thongBaoId)),
    danhDauTatCaDaDoc: xuLy(req => service.danhDauTatCaDaDoc(req.auth))
};