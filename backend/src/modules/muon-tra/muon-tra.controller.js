const service = require('./muon-tra.service.js');
class MuonTraController {
    xuLy(hanhDong,status = 200) {
        return async (req,res,next) => {
            try {
                let data;
                if (hanhDong === 'danhSach') data = await service.danhSach(req.auth,req.query);
                if (hanhDong === 'chiTiet') data = await service.chiTiet(req.auth,req.params.id);
                if (hanhDong === 'tao') data = await service.tao(req.auth,req.body,req.requestId);
                if (hanhDong === 'giao') data = await service.giao(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'tra') data = await service.tra(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'quaHan') data = await service.danhDauQuaHan(req.auth,req.requestId);
                if (hanhDong === 'taoGiaHan') data = await service.taoYeuCauGiaHan(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'duyetGiaHan') data = await service.duyetGiaHan(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'danhSachGiaHan') data = await service.danhSachGiaHan(req.auth,req.params.id);
                if (hanhDong === 'taoPhat') data = await service.taoPhieuPhat(req.auth,req.params.id,req.body,req.requestId);
                return res.status(status).json({ success: true,request_id: req.requestId,data });
            } catch (error) {
                next(error);
            }
        };
    }
}
module.exports = new MuonTraController();