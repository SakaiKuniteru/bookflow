const service = require('./phi-phat.service.js');

function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}

class PhiPhatController {
    async danhSach(req, res, next) {
        try {
            const data = await service.danhSach(req.auth, req.query);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async chiTiet(req, res, next) {
        try {
            const data = await service.chiTiet(req.auth, req.params.phiPhatId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async tao(req, res, next) {
        try {
            const data = await service.tao(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async taoLoai(req, res, next) {
        try {
            const data = await service.taoLoai(req.auth, req.body ?? {});
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async duyet(req, res, next) {
        try {
            const data = await service.duyet(req.auth, req.params.phiPhatId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async mienGiam(req, res, next) {
        try {
            const data = await service.mienGiam(req.auth, req.params.phiPhatId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async thuTien(req, res, next) {
        try {
            const data = await service.thuTien(req.auth, req.params.phiPhatId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async huy(req, res, next) {
        try {
            const data = await service.huy(req.auth, req.params.phiPhatId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}

module.exports = new PhiPhatController();