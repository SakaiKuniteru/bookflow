const service = require('./kiem-kho.service.js');
class KiemKhoController {
    xuLy(hanhDong, status = 200) {
        return async (req, res, next) => {
            try {
                const id = req.params.phieuId;
                let data;
                if (hanhDong === 'danhSach') data = await service.danhSach(req.auth, req.query);
                if (hanhDong === 'chiTiet') data = await service.chiTiet(req.auth, id);
                if (hanhDong === 'tao') data = await service.tao(req.auth, req.body, req.requestId);
                if (hanhDong === 'batDau') data = await service.batDau(req.auth, id, req.requestId);
                if (hanhDong === 'dem') data = await service.dem(req.auth, id, req.params.dongId, req.body, req.requestId);
                if (hanhDong === 'themSachNgoaiSo') data = await service.themSachNgoaiSo(req.auth, id, req.body, req.requestId);
                if (hanhDong === 'trinhDuyet') data = await service.trinhDuyet(req.auth, id, req.requestId);
                if (hanhDong === 'duyet') data = await service.duyet(req.auth, id, req.requestId);
                if (hanhDong === 'huy') data = await service.huy(req.auth, id, req.requestId);
                return res.status(status).json({ success: true, request_id: req.requestId, data });
            } catch (error) { next(error); }
        };
    }
}
module.exports = new KiemKhoController();