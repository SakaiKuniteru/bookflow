const service = require('./tep-tin.service.js');

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
    uploadNhieu: xuLy(req => service.uploadNhieu(req.auth, req.body, req.files), 201),
    danhSach: xuLy(req => service.danhSach(req.auth, req.query)),
    chiTiet: xuLy(req => service.chiTiet(req.auth, req.params.tepId)),
    urlDoc: xuLy(req => service.urlDoc(req.auth, req.params.tepId)),
    xoa: xuLy(req => service.xoa(req.auth, req.params.tepId))
};