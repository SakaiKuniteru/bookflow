const service = require('./gio-hang.service.js');
function xuLy(hanhDong,status = 200) {
    return async (req,res,next) => {
        try {
            const actions = {
                danhSach: () => service.danhSach(req.auth,req.query),
                chiTiet: () => service.chiTiet(req.auth,req.params.gioHangId),
                tao: () => service.tao(req.auth,req.body),
                themMatHang: () => service.themMatHang(req.auth,req.params.gioHangId,req.body),
                suaMatHang: () => service.suaMatHang(req.auth,req.params.gioHangId,req.params.matHangId,req.body),
                xoaMatHang: () => service.xoaMatHang(req.auth,req.params.gioHangId,req.params.matHangId),
                lamRong: () => service.lamRong(req.auth,req.params.gioHangId),
                huy: () => service.huy(req.auth,req.params.gioHangId)
            };
            return res.status(status).json({ success: true,request_id: req.requestId,data: await actions[hanhDong]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };