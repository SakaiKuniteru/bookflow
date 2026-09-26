const service = require('./ton-kho.service.js');
function tra(req, res, data) {
    return res.status(200).json({ success: true, request_id: req.requestId, data });
}
class TonKhoController {
    async danhSach(req, res, next) {
        try { return tra(req, res, await service.danhSach(req.auth, req.query)); }
        catch (error) { next(error); }
    }
    async tongHop(req, res, next) {
        try { return tra(req, res, await service.tongHop(req.auth, req.query)); }
        catch (error) { next(error); }
    }
    async lichSu(req, res, next) {
        try { return tra(req, res, await service.lichSu(req.auth, req.query)); }
        catch (error) { next(error); }
    }
}
module.exports = new TonKhoController();