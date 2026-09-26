const service = require('./nhan-vien.service.js');

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
    cuaToi: xuLy(req => service.cuaToi(req.auth)),
    chiTiet: xuLy(req => service.chiTiet(req.auth, req.params.thanhVienId)),
    moiNhanVien: xuLy(req => service.moiNhanVien(req.auth, req.body, req.requestId), 201),
    capNhat: xuLy(req => service.capNhat(req.auth, req.params.thanhVienId, req.body, req.requestId)),
    doiTrangThai: xuLy(req => service.doiTrangThai(req.auth, req.params.thanhVienId, req.body, req.requestId)),
    chuyenChiNhanh: xuLy(req => service.chuyenChiNhanh(req.auth, req.params.thanhVienId, req.body, req.requestId)),
    danhSachViTri: xuLy(req => service.danhSachViTri(req.auth)),
    taoViTri: xuLy(req => service.taoViTri(req.auth, req.body), 201),
    phanCongViTri: xuLy(req => service.phanCongViTri(req.auth, req.params.thanhVienId, req.body, req.requestId)),
    lichSu: xuLy(req => service.lichSu(req.auth, req.params.thanhVienId, req.query))
};