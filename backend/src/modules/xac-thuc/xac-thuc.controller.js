import * as service from './xac-thuc.service.js';

const cauHinhCookie = () => ({
    httpOnly: true, secure: process.env.APP_ENV !== 'dev',
    sameSite: 'strict', path: '/api', maxAge: 7 * 86400000
});

function ganCookie(req, res, phien) {
    res.cookie('bookflow_sid', phien.token, cauHinhCookie());
    res.cookie('bookflow_csrf', phien.csrf, { ...cauHinhCookie(), httpOnly: false });
}

function xoaCookie(res) {
    res.clearCookie('bookflow_sid', { ...cauHinhCookie(), maxAge: undefined });
    res.clearCookie('bookflow_csrf', { ...cauHinhCookie(), maxAge: undefined, httpOnly: false });
}

function tra(req, res, data, status = 200) {
    res.status(status).json({ success: true, request_id: req.requestId, data });
}

const xuLy = handler => async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) { next(error); }
};

export const dangKy = xuLy(async (req, res) => {
    const data = await service.dangKy(req.body ?? {});
    tra(req, res, data, 201);
});

export const xacNhanDangKy = xuLy(async (req, res) => {
    const data = await service.xacNhanDangKy(req.body ?? {});
    tra(req, res, data);
});

export const guiLaiOtpDangKy = xuLy(async (req, res) => {
    const data = await service.guiLaiOtpDangKy(req.body ?? {});
    tra(req, res, data, 202);
});

export const dangNhap = xuLy(async (req, res) => {
    const data = await service.dangNhap(req.body ?? {});
    if (data.phien) {
        ganCookie(req, res, data.phien);
        delete data.phien;
    }
    tra(req, res, data, data.yeu_cau_kich_hoat ? 202 : 200);
});

export const hoanTatNhanVien = xuLy(async (req, res) => {
    const data = await service.hoanTatNhanVien(req.body ?? {}, req.requestId);
    ganCookie(req, res, data.phien);
    delete data.phien;
    tra(req, res, data);
});

export const me = xuLy(async (req, res) => {
    const data = await service.layNguoiDung(req.auth);
    tra(req, res, data);
});

export const lamMoiPhien = xuLy(async (req, res) => {
    const data = await service.lamMoiPhien(req.auth);
    ganCookie(req, res, data.phien);
    tra(req, res, { thong_bao: 'Đã làm mới phiên' });
});

export const dangXuat = xuLy(async (req, res) => {
    const data = await service.dangXuat(req.auth);
    xoaCookie(res);
    tra(req, res, data);
});

export const quenMatKhau = xuLy(async (req, res) => {
    const data = await service.quenMatKhau(req.body ?? {});
    tra(req, res, data, 202);
});

export const datLaiMatKhau = xuLy(async (req, res) => {
    const data = await service.datLaiMatKhau(req.body ?? {});
    tra(req, res, data);
});

export const yeuCauDoiMatKhau = xuLy(async (req, res) => {
    const data = await service.yeuCauDoiMatKhau(req.auth.taiKhoanId, req.body ?? {});
    tra(req, res, data, 202);
});

export const doiMatKhau = xuLy(async (req, res) => {
    const data = await service.doiMatKhau(req.auth.taiKhoanId, req.body ?? {});
    xoaCookie(res);
    tra(req, res, data);
});

export const chonDonVi = xuLy(async (req, res) => {
    const data = await service.chonDonVi(req.auth, req.body ?? {});
    tra(req, res, data);
});

export const taoNhanVienBoiAdmin = xuLy(async (req, res) => {
    const data = await service.taoNhanVienBoiAdmin(req.auth, req.body ?? {}, req.requestId);
    tra(req, res, data, 201);
});

export const guiLaiThuMoiNhanVien = xuLy(async (req, res) => {
    const data = await service.guiLaiThuMoiNhanVien(req.auth, req.params.taiKhoanId, req.requestId);
    tra(req, res, data);
});