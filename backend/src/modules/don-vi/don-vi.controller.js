const service = require('./don-vi.service.js');

function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}

class DonViController {
    async taoDonVi(req, res, next) {
        try {
            const data = await service.taoDonVi(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }

    async danhSachDonVi(req, res, next) {
        try {
            const data = await service.danhSachDonVi(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async donViHienTai(req, res, next) {
        try {
            const data = await service.donViHienTai(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async capNhatDonVi(req, res, next) {
        try {
            const data = await service.capNhatDonVi(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}

module.exports = new DonViController();