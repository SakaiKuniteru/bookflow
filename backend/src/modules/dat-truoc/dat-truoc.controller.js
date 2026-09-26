const service = require('./dat-truoc.service.js');
class DatTruocController {
    xuLy(hanhDong,status = 200) {
        return async (req,res,next) => {
            try {
                let data;
                if (hanhDong === 'danhSach') data = await service.danhSach(req.auth,req.query);
                if (hanhDong === 'chiTiet') data = await service.chiTiet(req.auth,req.params.id);
                if (hanhDong === 'tao') data = await service.tao(req.auth,req.body,req.requestId);
                if (hanhDong === 'phanBo') data = await service.phanBo(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'thongBao') data = await service.thongBao(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'choNhan') data = await service.choNhan(req.auth,req.params.id,req.requestId);
                if (hanhDong === 'nhanSach') data = await service.nhanSach(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'huy') data = await service.huy(req.auth,req.params.id,req.body,req.requestId);
                if (hanhDong === 'hetHan') data = await service.xuLyHetHan(req.auth,req.requestId);
                if (hanhDong === 'tuDongPhanBo') data = await service.tuDongPhanBo(req.auth,req.params.phienBanSachId,req.requestId);
                return res.status(status).json({ success: true,request_id: req.requestId,data });
            } catch (error) {
                next(error);
            }
        };
    }
}
module.exports = new DatTruocController();