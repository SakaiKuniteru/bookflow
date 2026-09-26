const service = require('./nhap-kho.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class NhapKhoController {
    xuLy(hanhDong, status = 200) {
        return async (req, res, next) => {
            try {
                const id = req.params.phieuId;
                const dongId = req.params.dongId;
                let data;
                if (hanhDong === 'danhSach') data = await service.danhSach(req.auth, req.query);
                if (hanhDong === 'chiTiet') data = await service.chiTiet(req.auth, id);
                if (hanhDong === 'tao') data = await service.tao(req.auth, req.body, req.requestId);
                if (hanhDong === 'sua') data = await service.sua(req.auth, id, req.body, req.requestId);
                if (hanhDong === 'themDong') data = await service.themDong(req.auth, id, req.body, req.requestId);
                if (hanhDong === 'suaDong') data = await service.suaDong(req.auth, id, dongId, req.body, req.requestId);
                if (hanhDong === 'xoaDong') data = await service.xoaDong(req.auth, id, dongId, req.requestId);
                if (hanhDong === 'batDauKiemNhan') data = await service.batDauKiemNhan(req.auth, id, req.requestId);
                if (hanhDong === 'kiemNhan') data = await service.kiemNhan(req.auth, id, dongId, req.body, req.requestId);
                if (hanhDong === 'xacNhan') data = await service.xacNhan(req.auth, id, req.requestId);
                if (hanhDong === 'huy') data = await service.huy(req.auth, id, req.requestId);
                return tra(req, res, data, status);
            } catch (error) { next(error); }
        };
    }
}
module.exports = new NhapKhoController();