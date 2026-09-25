import * as service from './don-vi.service.js';

function tra(req, res, data, status = 200) {
    res.status(status).json({ success: true, request_id: req.requestId, data });
}

const xuLy = handler => async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) { next(error); }
};

export const taoDonVi = xuLy(async (req, res) => {
    const data = await service.taoDonVi(req.auth, req.body ?? {}, req.requestId);
    tra(req, res, data, 201);
});

export const danhSachDonVi = xuLy(async (req, res) => {
    const data = await service.danhSachDonVi(req.auth);
    tra(req, res, data);
});

export const donViHienTai = xuLy(async (req, res) => {
    const data = await service.donViHienTai(req.auth);
    tra(req, res, data);
});

export const capNhatDonVi = xuLy(async (req, res) => {
    const data = await service.capNhatDonVi(req.auth, req.body ?? {}, req.requestId);
    tra(req, res, data);
});