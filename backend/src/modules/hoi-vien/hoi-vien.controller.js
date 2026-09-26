const service = require('./hoi-vien.service.js');
function xuLy(hanhDong, status = 200) {
    return async (req,res,next) => {
        try {
            const hangId = req.params.hangId;
            const hoiVienId = req.params.hoiVienId;
            const args = {
                danhSachHang: () => service.danhSachHang(req.auth),
                chiTietHang: () => service.chiTietHang(req.auth,hangId),
                taoHang: () => service.taoHang(req.auth,req.body,req.requestId),
                suaHang: () => service.suaHang(req.auth,hangId,req.body,req.requestId),
                taoChinhSach: () => service.taoChinhSach(req.auth,hangId,req.body,req.requestId),
                danhSach: () => service.danhSach(req.auth,req.query),
                chiTiet: () => service.chiTiet(req.auth,hoiVienId),
                dangKy: () => service.dangKy(req.auth,req.body,req.requestId),
                chuyenHang: () => service.chuyenHang(req.auth,hoiVienId,req.body,req.requestId),
                giaoDichDiem: () => service.giaoDichDiem(req.auth,hoiVienId,req.body,req.requestId)
            };
            return res.status(status).json({ success: true, request_id: req.requestId, data: await args[hanhDong]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };