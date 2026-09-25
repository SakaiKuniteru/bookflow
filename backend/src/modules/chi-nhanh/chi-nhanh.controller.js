import * as service from './chi-nhanh.service.js';

function tra(req, res, data, status = 200) {
    res.status(status).json({ success: true, request_id: req.requestId, data });
}

const xuLy = handler => async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) { next(error); }
};

export const danhSachChiNhanh = xuLy(async (req, res) => {
    const data = await service.danhSachChiNhanh(req.auth);
    tra(req, res, data);
});

export const chiTietChiNhanh = xuLy(async (req, res) => {
    const data = await service.chiTietChiNhanh(req.auth, req.params.chiNhanhId);
    tra(req, res, data);
});

export const taoChiNhanh = xuLy(async (req, res) => {
    const data = await service.taoChiNhanh(req.auth, req.body ?? {}, req.requestId);
    tra(req, res, data, 201);
});

export const capNhatChiNhanh = xuLy(async (req, res) => {
    const data = await service.capNhatChiNhanh(req.auth, req.params.chiNhanhId, req.body ?? {}, req.requestId);
    tra(req, res, data);
});

export const doiTrangThaiChiNhanh = xuLy(async (req, res) => {
    const data = await service.doiTrangThaiChiNhanh(req.auth, req.params.chiNhanhId, req.body ?? {}, req.requestId);
    tra(req, res, data);
});

export const chonChiNhanh = xuLy(async (req, res) => {
    const data = await service.chonChiNhanh(req.auth, req.body ?? {});
    tra(req, res, data);
});

export const chiNhanhDangChon = xuLy(async (req, res) => {
    const data = await service.chiNhanhDangChon(req.auth);
    tra(req, res, data);
});

export const danhSachNhanVien = xuLy(async (req, res) => {
    const data = await service.danhSachNhanVien(req.auth, req.params.chiNhanhId);
    tra(req, res, data);
});

export const phanCongNhanVien = xuLy(async (req, res) => {
    const data = await service.phanCongNhanVien(req.auth, req.params.chiNhanhId, req.params.thanhVienId, req.body ?? {}, req.requestId);
    tra(req, res, data, 200);
});

export const boPhanCongNhanVien = xuLy(async (req, res) => {
    const data = await service.boPhanCongNhanVien(req.auth, req.params.chiNhanhId, req.params.thanhVienId, req.requestId);
    tra(req, res, data);
});