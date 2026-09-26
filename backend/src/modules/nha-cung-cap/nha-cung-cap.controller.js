const service = require('./nha-cung-cap.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class NhaCungCapController {
    xuLy(hanhDong, status = 200) {
        return async (req, res, next) => {
            try {
                const bang = req.loaiBang ?? 'nha_cung_cap';
                const id = req.params.banGhiId ?? req.params.nhaCungCapId;
                const chaId = req.loaiBang ? req.params.nhaCungCapId : null;
                let data;
                if (hanhDong === 'danhSach') data = await service.danhSach(req.auth, bang, req.query, chaId);
                if (hanhDong === 'chiTiet') data = await service.chiTiet(req.auth, bang, id, chaId);
                if (hanhDong === 'tao') data = await service.tao(req.auth, bang, req.body ?? {}, req.requestId, chaId);
                if (hanhDong === 'sua') data = await service.sua(req.auth, bang, id, req.body ?? {}, req.requestId, chaId);
                if (hanhDong === 'xoa') data = await service.xoa(req.auth, bang, id, req.requestId, chaId);
                return tra(req, res, data, status);
            } catch (error) { next(error); }
        };
    }
}
module.exports = new NhaCungCapController();