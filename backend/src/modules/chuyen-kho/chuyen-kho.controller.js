const service = require('./chuyen-kho.service.js');
class ChuyenKhoController {
    xuLy(hanhDong, status = 200) {
        return async (req, res, next) => {
            try {
                const id = req.params.phieuId;
                const dongId = req.params.dongId;
                let data;
                if (hanhDong === 'danhSach') data = await service.danhSach(req.auth, req.query);
                if (hanhDong === 'chiTiet') data = await service.chiTiet(req.auth, id);
                if (hanhDong === 'tao') data = await service.tao(req.auth, req.body, req.requestId);
                if (hanhDong === 'themDong') data = await service.themDong(req.auth, id, req.body, req.requestId);
                if (hanhDong === 'xoaDong') data = await service.xoaDong(req.auth, id, dongId, req.requestId);
                if (hanhDong === 'xuat') data = await service.xuat(req.auth, id, req.requestId);
                if (hanhDong === 'nhan') data = await service.nhan(req.auth, id, req.requestId);
                if (hanhDong === 'huy') data = await service.huy(req.auth, id, req.requestId);
                return res.status(status).json({ success: true, request_id: req.requestId, data });
            } catch (error) { next(error); }
        };
    }
}
module.exports = new ChuyenKhoController();