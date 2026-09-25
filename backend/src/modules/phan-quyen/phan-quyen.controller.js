import * as service from './phan-quyen.service.js';

function tra(req, res, data, status = 200) {
    res.status(status).json({ success: true, request_id: req.requestId, data });
}

const xuLy = handler => async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) { next(error); }
};

export const quyenCuaToi = xuLy(async (req, res) => {
    const data = await service.quyenCuaToi(req.auth);
    tra(req, res, data);
});

export const danhMucQuyen = xuLy(async (req, res) => {
    const data = await service.danhMucQuyen(req.auth);
    tra(req, res, data);
});

export const danhSachVaiTro = xuLy(async (req, res) => {
    const data = await service.danhSachVaiTro(req.auth);
    tra(req, res, data);
});

export const quyenCuaVaiTro = xuLy(async (req, res) => {
    const data = await service.quyenCuaVaiTro(req.auth, req.params.vaiTroId);
    tra(req, res, data);
});

export const taoVaiTro = xuLy(async (req, res) => {
    const data = await service.taoVaiTro(req.auth, req.body ?? {}, req.requestId);
    tra(req, res, data, 201);
});

export const suaVaiTro = xuLy(async (req, res) => {
    const data = await service.suaVaiTro(req.auth, req.params.vaiTroId, req.body ?? {}, req.requestId);
    tra(req, res, data);
});

export const voHieuVaiTro = xuLy(async (req, res) => {
    const data = await service.voHieuVaiTro(req.auth, req.params.vaiTroId, req.requestId);
    tra(req, res, data);
});

export const thayQuyenVaiTro = xuLy(async (req, res) => {
    const data = await service.thayQuyenVaiTro(req.auth, req.params.vaiTroId, req.body ?? {}, req.requestId);
    tra(req, res, data);
});

export const vaiTroCuaThanhVien = xuLy(async (req, res) => {
    const data = await service.vaiTroCuaThanhVien(req.auth, req.params.thanhVienId);
    tra(req, res, data);
});

export const ganVaiTro = xuLy(async (req, res) => {
    const data = await service.ganVaiTro(req.auth, req.params.thanhVienId, req.body ?? {}, req.requestId);
    tra(req, res, data, 201);
});

export const thuHoiVaiTro = xuLy(async (req, res) => {
    const data = await service.thuHoiVaiTro(req.auth, req.params.thanhVienId, req.params.ganVaiTroId, req.requestId);
    tra(req, res, data);
});