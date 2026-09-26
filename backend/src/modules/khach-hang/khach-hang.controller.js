const service = require('./khach-hang.service.js');
function xuLy(hanhDong, status = 200) {
    return async (req,res,next) => {
        try {
            const id = req.params.khachHangId;
            const diaChiId = req.params.diaChiId;
            const lienHeId = req.params.lienHeId;
            const args = {
                danhSach: () => service.danhSach(req.auth,req.query),
                chiTiet: () => service.chiTiet(req.auth,id),
                tao: () => service.tao(req.auth,req.body,req.requestId),
                sua: () => service.sua(req.auth,id,req.body,req.requestId),
                doiTrangThai: () => service.doiTrangThai(req.auth,id,req.body,req.requestId),
                taoDiaChi: () => service.taoDiaChi(req.auth,id,req.body,req.requestId),
                suaDiaChi: () => service.suaDiaChi(req.auth,id,diaChiId,req.body,req.requestId),
                xoaDiaChi: () => service.xoaDiaChi(req.auth,id,diaChiId,req.requestId),
                taoLienHe: () => service.taoLienHe(req.auth,id,req.body,req.requestId),
                suaLienHe: () => service.suaLienHe(req.auth,id,lienHeId,req.body,req.requestId),
                xoaLienHe: () => service.xoaLienHe(req.auth,id,lienHeId,req.requestId),
                taoTuongTac: () => service.taoTuongTac(req.auth,id,req.body,req.requestId),
                lichSuGiaoDich: () => service.lichSuGiaoDich(req.auth,id)
            };
            return res.status(status).json({ success: true, request_id: req.requestId, data: await args[hanhDong]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };